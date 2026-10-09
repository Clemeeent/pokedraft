import { BALL_TIERS, DRAFT } from "../config/game";
import { isLegendary, type Species } from "./model";
import { createRng, seedOf, weightedIndex, type Rng } from "./rng";

export type DraftConfig = typeof DRAFT;
export type RerollConstraint = "sameType" | "sameGeneration" | "free";
export const REROLL_CONSTRAINTS: RerollConstraint[] = ["sameType", "sameGeneration", "free"];

export interface RosterSlot {
  speciesId: number;
  shiny: boolean;
}

export interface RerollRecord {
  slot: number;
  constraint: RerollConstraint;
  replaced: RosterSlot;
  options: RosterSlot[];
  chosen: number;
}

export interface DraftState {
  dayKey: string;
  playerId: string;
  /** Seed of this player's draft = day seed + player id. */
  seed: string;
  roster: RosterSlot[];
  rerollsLeft: number;
  rerolls: RerollRecord[];
  /** A reroll whose cost is paid but whose option is not chosen yet. */
  pending: { slot: number; constraint: RerollConstraint; options: RosterSlot[] } | null;
  /** Roster indices of the final team, in entry order. */
  team: number[];
  locked: boolean;
}

export class DraftError extends Error {}

export type BallTier = "poke" | "great" | "ultra" | "master";

export function ballTier(s: Species, tiers = BALL_TIERS): BallTier {
  if (isLegendary(s)) return "master";
  if (s.bst >= tiers.ultra) return "ultra";
  if (s.bst >= tiers.great) return "great";
  return "poke";
}

/** The day's global seed: same for every player (date + theme). */
export const daySeed = (dayKey: string, themeId: string) => seedOf("day", dayKey, themeId);
export const playerSeed = (day: string, playerId: string) => seedOf(day, "player", playerId);

function drawWeight(s: Species, cfg: DraftConfig): number {
  if (isLegendary(s)) return cfg.legendaryWeight;
  if (s.isBaby) return cfg.babyWeight;
  return 1;
}

/** Weighted draw of `count` distinct Pokémon, respecting the legendary cap. */
function drawDistinct(
  rng: Rng,
  candidates: Species[],
  count: number,
  legendariesAllowed: number,
  cfg: DraftConfig,
): RosterSlot[] {
  const remaining = [...candidates];
  const result: RosterSlot[] = [];
  let legendsLeft = legendariesAllowed;
  while (result.length < count) {
    const weights = remaining.map((s) => (isLegendary(s) && legendsLeft <= 0 ? 0 : drawWeight(s, cfg)));
    const i = weightedIndex(rng, weights);
    if (i < 0) break;
    const [picked] = remaining.splice(i, 1);
    if (isLegendary(picked)) legendsLeft--;
    result.push({ speciesId: picked.id, shiny: rng.chance(cfg.shinyChance) });
  }
  return result;
}

export function drawRoster(pool: Species[], seed: string, cfg: DraftConfig = DRAFT): RosterSlot[] {
  const roster = drawDistinct(createRng(seedOf(seed, "roster")), pool, cfg.rosterSize, cfg.maxLegendariesPerRoster, cfg);
  if (roster.length < cfg.rosterSize) throw new DraftError("Pool too small for a roster");
  return roster;
}

export function startDraft(pool: Species[], dayKey: string, day: string, playerId: string, cfg: DraftConfig = DRAFT): DraftState {
  const seed = playerSeed(day, playerId);
  return {
    dayKey,
    playerId,
    seed,
    roster: drawRoster(pool, seed, cfg),
    rerollsLeft: cfg.rerollsPerDay,
    rerolls: [],
    pending: null,
    team: [],
    locked: false,
  };
}

/**
 * The options a reroll would offer. Deterministic: depends on the draft seed, the reroll number,
 * the slot and the constraint, so it cannot be "refreshed" and can be recomputed by the server.
 */
export function rerollOptions(
  state: DraftState,
  pool: Species[],
  slot: number,
  constraint: RerollConstraint,
  cfg: DraftConfig = DRAFT,
): RosterSlot[] {
  const byId = new Map(pool.map((s) => [s.id, s]));
  const replaced = byId.get(state.roster[slot].speciesId);
  if (!replaced) throw new DraftError("Unknown roster Pokémon");
  const inRoster = new Set(state.roster.map((r) => r.speciesId));
  const legendsElsewhere = state.roster.filter((r, i) => i !== slot && isLegendary(byId.get(r.speciesId)!)).length;

  const candidates = pool.filter((s) => {
    if (inRoster.has(s.id)) return false;
    if (constraint === "sameType") return s.types.some((t) => replaced.types.includes(t));
    if (constraint === "sameGeneration") return s.generation === replaced.generation;
    return true;
  });
  const rng = createRng(seedOf(state.seed, "reroll", state.rerolls.length, slot, constraint));
  return drawDistinct(rng, candidates, cfg.rerollOptions, cfg.maxLegendariesPerRoster - legendsElsewhere, cfg);
}

function assertEditable(state: DraftState) {
  if (state.locked) throw new DraftError("Team is locked");
}

/** Pays the reroll cost and reveals the options. Irreversible: one option must then be chosen. */
export function startReroll(
  state: DraftState,
  pool: Species[],
  slot: number,
  constraint: RerollConstraint,
  cfg: DraftConfig = DRAFT,
): DraftState {
  assertEditable(state);
  if (state.pending) throw new DraftError("A reroll is already in progress");
  if (slot < 0 || slot >= state.roster.length) throw new DraftError("Invalid slot");
  const cost = cfg.rerollCost[constraint];
  if (state.rerollsLeft < cost) throw new DraftError("Not enough rerolls");
  const options = rerollOptions(state, pool, slot, constraint, cfg);
  if (options.length === 0) throw new DraftError("No Pokémon matches this constraint");
  return { ...state, rerollsLeft: state.rerollsLeft - cost, pending: { slot, constraint, options } };
}

export function chooseRerollOption(state: DraftState, optionIndex: number): DraftState {
  assertEditable(state);
  const pending = state.pending;
  if (!pending) throw new DraftError("No reroll in progress");
  const option = pending.options[optionIndex];
  if (!option) throw new DraftError("Invalid option");
  const roster = state.roster.map((r, i) => (i === pending.slot ? option : r));
  return {
    ...state,
    roster,
    pending: null,
    // The replaced Pokémon leaves the team if it was selected.
    team: state.team.filter((i) => i !== pending.slot),
    rerolls: [...state.rerolls, { ...pending, replaced: state.roster[pending.slot], chosen: optionIndex }],
  };
}

/** Sets the final team: roster indices in entry order (fewer than 3 while the player is choosing). */
export function setTeam(state: DraftState, team: number[], cfg: DraftConfig = DRAFT): DraftState {
  assertEditable(state);
  if (team.length > cfg.teamSize) throw new DraftError(`At most ${cfg.teamSize} Pokémon`);
  if (new Set(team).size !== team.length) throw new DraftError("Duplicate Pokémon in team");
  if (team.some((i) => !Number.isInteger(i) || i < 0 || i >= state.roster.length)) throw new DraftError("Invalid roster index");
  return { ...state, team };
}

export function lockTeam(state: DraftState, cfg: DraftConfig = DRAFT): DraftState {
  assertEditable(state);
  if (state.pending) throw new DraftError("Finish the reroll first");
  if (state.team.length !== cfg.teamSize) throw new DraftError(`Pick exactly ${cfg.teamSize} Pokémon`);
  return { ...state, locked: true };
}

export function teamMembers(state: DraftState): RosterSlot[] {
  return state.team.map((i) => state.roster[i]);
}
