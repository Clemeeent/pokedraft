import { BATTLE, ENERGY } from "../config/game";
import { calcDamage, neutralStages, stageMultiplier, type StatStages } from "./damage";
import type { Ailment, BaseStats, Dex, Move, Species } from "./model";
import { createRng, type Rng } from "./rng";
import { averageHits, computeStats, energyCost } from "./stats";
import { typeEffectiveness } from "./types";

export type Side = 0 | 1;

export interface TeamMember {
  speciesId: number;
  shiny: boolean;
}

/** 3 Pokémon in entry order (the first one opens the battle). */
export interface BattleTeam {
  name: string;
  members: TeamMember[];
}

export type BattleEvent =
  | { kind: "send-out"; side: Side; slot: number; hp: number; maxHp: number }
  | { kind: "turn"; turn: number; energy: [number, number] }
  | { kind: "move"; side: Side; slot: number; moveId: number; energyLeft: number }
  | { kind: "miss"; side: Side; slot: number }
  | { kind: "immune"; side: Side; slot: number }
  | { kind: "damage"; side: Side; slot: number; amount: number; hp: number; maxHp: number; effectiveness: number; crit: boolean; hits: number }
  | { kind: "status"; side: Side; slot: number; status: Ailment }
  | { kind: "stat"; side: Side; slot: number; stat: keyof StatStages; change: number }
  | { kind: "status-damage"; side: Side; slot: number; status: Ailment; amount: number; hp: number; maxHp: number }
  | { kind: "recoil"; side: Side; slot: number; amount: number; hp: number; maxHp: number }
  | { kind: "drain"; side: Side; slot: number; amount: number; hp: number; maxHp: number }
  | { kind: "paralyzed"; side: Side; slot: number }
  | { kind: "switch"; side: Side; fromSlot: number; toSlot: number; hp: number; maxHp: number }
  | { kind: "faint"; side: Side; slot: number }
  | { kind: "end"; winner: Side; reason: "ko" | "timeout"; turns: number };

export interface BattleResult {
  winner: Side;
  turns: number;
  events: BattleEvent[];
  /** HP left per team member (0 = fainted). */
  hpLeft: [number[], number[]];
}

interface Combatant {
  side: Side;
  slot: number;
  species: Species;
  types: Species["types"];
  moves: Move[];
  stats: BaseStats;
  maxHp: number;
  hp: number;
  energy: number;
  status: Ailment | null;
  stages: StatStages;
  switchOuts: number;
}

type Action = { kind: "move"; move: Move } | { kind: "switch"; toSlot: number };

export interface BattleConfig {
  battle: typeof BATTLE;
  energy: typeof ENERGY;
}

const DEFAULT_CONFIG: BattleConfig = { battle: BATTLE, energy: ENERGY };

/** Marker replaced by the dex's Struggle at runtime (keeps chooseAction free of dex access). */
const STRUGGLE_PLACEHOLDER = { id: -1 } as Move;

/** Expected damage of a move, without randomness (used by the AI). */
function expectedDamage(attacker: Combatant, defender: Combatant, move: Move, cfg: BattleConfig): number {
  const { damage } = calcDamage(attacker, defender, move, { random: 1 - cfg.battle.damageVariance / 2, crit: false }, cfg.battle);
  return damage * averageHits(move) * ((move.accuracy ?? 100) / 100);
}

const bestEffectiveness = (attacker: Combatant, defender: Combatant) =>
  Math.max(0, ...attacker.moves.map((m) => typeEffectiveness(m.type, defender.species.types)));

/**
 * Battle AI (deterministic):
 * 1. switch if the matchup is very bad and a bench Pokémon does clearly better;
 * 2. finish the opponent with the cheapest move that KOs;
 * 3. use the most damaging move if it is affordable;
 * 4. otherwise use the cheapest damaging move, saving energy for the big one.
 */
function chooseAction(me: Combatant, foe: Combatant, bench: Combatant[], cfg: BattleConfig): Action {
  const b = cfg.battle;
  if (me.switchOuts < b.maxSwitchOutsPerPokemon && bench.length > 0) {
    const own = bestEffectiveness(me, foe);
    const threat = bestEffectiveness(foe, me);
    if (own <= b.switchIfOwnBestEffectiveness && threat >= b.switchIfThreatEffectiveness) {
      const better = bench.find((c) => bestEffectiveness(c, foe) >= 1 && bestEffectiveness(foe, c) <= 1);
      if (better) return { kind: "switch", toSlot: better.slot };
    }
  }

  const affordable = me.moves.filter((m) => energyCost(m, cfg.energy) <= me.energy);
  if (affordable.length === 0) return { kind: "move", move: STRUGGLE_PLACEHOLDER };

  const scored = me.moves.map((move) => ({ move, cost: energyCost(move, cfg.energy), dmg: expectedDamage(me, foe, move, cfg) }));
  const usable = scored.filter((s) => s.cost <= me.energy);
  const byCost = (x: (typeof scored)[number], y: (typeof scored)[number]) => x.cost - y.cost || y.dmg - x.dmg;

  const kills = usable.filter((s) => s.dmg >= foe.hp).sort(byCost);
  if (kills.length > 0) return { kind: "move", move: kills[0].move };

  const best = [...scored].sort((x, y) => y.dmg - x.dmg || x.cost - y.cost)[0];
  if (best.cost <= me.energy) return { kind: "move", move: best.move };

  const damaging = usable.filter((s) => s.dmg > 0);
  return { kind: "move", move: (damaging.length > 0 ? damaging : usable).sort(byCost)[0].move };
}

function effectiveSpeed(c: Combatant, cfg: BattleConfig): number {
  const para = c.status === "paralysis" ? cfg.battle.paralysisSpeedMultiplier : 1;
  return c.stats.spe * stageMultiplier(c.stages.spe) * para;
}

const canHaveStatus = (c: Combatant, status: Ailment) => {
  const t = c.species.types;
  if (status === "burn") return !t.includes("fire");
  if (status === "paralysis") return !t.includes("electric");
  return !t.includes("poison") && !t.includes("steel");
};

export function simulateBattle(
  teamA: BattleTeam,
  teamB: BattleTeam,
  seed: string,
  dex: Dex,
  cfg: BattleConfig = DEFAULT_CONFIG,
): BattleResult {
  const rng: Rng = createRng(seed);
  const events: BattleEvent[] = [];
  const build = (team: BattleTeam, side: Side): Combatant[] =>
    team.members.map((m, slot) => {
      const species = dex.speciesById.get(m.speciesId);
      if (!species) throw new Error(`Unknown species ${m.speciesId}`);
      const stats = computeStats(species.baseStats, cfg.battle);
      return {
        side,
        slot,
        species,
        types: species.types,
        moves: species.moves.map((id) => dex.movesById.get(id)!).filter(Boolean),
        stats,
        maxHp: stats.hp,
        hp: stats.hp,
        energy: cfg.energy.start,
        status: null,
        stages: neutralStages(),
        switchOuts: 0,
      };
    });

  const teams: [Combatant[], Combatant[]] = [build(teamA, 0), build(teamB, 1)];
  const active: [Combatant, Combatant] = [teams[0][0], teams[1][0]];
  const faintOrder: Side[] = [];
  for (const c of active) events.push({ kind: "send-out", side: c.side, slot: c.slot, hp: c.hp, maxHp: c.maxHp });

  const alive = (side: Side) => teams[side].filter((c) => c.hp > 0);
  const faint = (c: Combatant) => {
    events.push({ kind: "faint", side: c.side, slot: c.slot });
    faintOrder.push(c.side);
  };

  const executeMove = (user: Combatant, target: Combatant, chosen: Move) => {
    const move = chosen.id === STRUGGLE_PLACEHOLDER.id ? dex.struggle : chosen;
    if (user.status === "paralysis" && rng.chance(cfg.battle.paralysisSkipChance)) {
      events.push({ kind: "paralyzed", side: user.side, slot: user.slot });
      return;
    }
    if (move !== dex.struggle) user.energy -= energyCost(move, cfg.energy);
    events.push({ kind: "move", side: user.side, slot: user.slot, moveId: move.id, energyLeft: user.energy });

    if (move.accuracy !== null && !rng.chance(move.accuracy / 100)) {
      events.push({ kind: "miss", side: user.side, slot: user.slot });
      return;
    }
    if (typeEffectiveness(move.type, target.species.types) === 0) {
      events.push({ kind: "immune", side: target.side, slot: target.slot });
      return;
    }

    const hits = move.minHits === move.maxHits ? move.minHits : rng.int(move.minHits, move.maxHits);
    let total = 0;
    let crit = false;
    let effectiveness = 1;
    for (let i = 0; i < hits && target.hp - total > 0; i++) {
      const isCrit = rng.chance(move.highCrit ? cfg.battle.highCritChance : cfg.battle.critChance);
      const random = 1 - rng.next() * cfg.battle.damageVariance;
      const result = calcDamage(user, target, move, { random, crit: isCrit }, cfg.battle);
      total += result.damage;
      effectiveness = result.effectiveness;
      crit ||= isCrit;
    }
    const dealt = Math.min(total, target.hp);
    target.hp -= dealt;
    events.push({ kind: "damage", side: target.side, slot: target.slot, amount: dealt, hp: target.hp, maxHp: target.maxHp, effectiveness, crit, hits });

    if (move === dex.struggle) {
      const recoil = Math.min(user.hp, Math.max(1, Math.floor(user.maxHp / 4)));
      user.hp -= recoil;
      events.push({ kind: "recoil", side: user.side, slot: user.slot, amount: recoil, hp: user.hp, maxHp: user.maxHp });
    } else if (move.drain > 0 && user.hp < user.maxHp) {
      const heal = Math.min(user.maxHp - user.hp, Math.max(1, Math.floor((dealt * move.drain) / 100)));
      user.hp += heal;
      events.push({ kind: "drain", side: user.side, slot: user.slot, amount: heal, hp: user.hp, maxHp: user.maxHp });
    } else if (move.drain < 0) {
      const recoil = Math.min(user.hp, Math.max(1, Math.floor((dealt * -move.drain) / 100)));
      user.hp -= recoil;
      events.push({ kind: "recoil", side: user.side, slot: user.slot, amount: recoil, hp: user.hp, maxHp: user.maxHp });
    }

    if (target.hp > 0 && move.ailment && !target.status && canHaveStatus(target, move.ailment) && rng.chance(move.ailmentChance / 100)) {
      target.status = move.ailment;
      events.push({ kind: "status", side: target.side, slot: target.slot, status: move.ailment });
    }
    const statTarget = move.selfTarget ? user : target;
    if (move.statChanges.length > 0 && statTarget.hp > 0 && rng.chance((move.statChance || 100) / 100)) {
      for (const { stat, change } of move.statChanges) {
        statTarget.stages[stat] = Math.max(-6, Math.min(6, statTarget.stages[stat] + change));
        events.push({ kind: "stat", side: statTarget.side, slot: statTarget.slot, stat, change });
      }
    }
    if (target.hp <= 0) faint(target);
    if (user.hp <= 0) faint(user);
  };

  let turn = 0;
  let reason: "ko" | "timeout" = "ko";
  while (alive(0).length > 0 && alive(1).length > 0) {
    turn++;
    if (turn > cfg.battle.maxTurns) {
      reason = "timeout";
      turn--;
      break;
    }
    for (const c of active) c.energy = Math.min(cfg.energy.max, c.energy + cfg.energy.perTurn);
    events.push({ kind: "turn", turn, energy: [active[0].energy, active[1].energy] });

    const actions = ([0, 1] as const).map((side) => {
      const me = active[side];
      const bench = teams[side].filter((c) => c !== me && c.hp > 0);
      return chooseAction(me, active[side === 0 ? 1 : 0], bench, cfg);
    });

    // Switches happen before moves.
    for (const side of [0, 1] as const) {
      const action = actions[side];
      if (action.kind !== "switch") continue;
      const from = active[side];
      from.switchOuts++;
      from.stages = neutralStages();
      active[side] = teams[side][action.toSlot];
      events.push({ kind: "switch", side, fromSlot: from.slot, toSlot: action.toSlot, hp: active[side].hp, maxHp: active[side].maxHp });
    }

    const movers = ([0, 1] as const)
      .filter((side) => actions[side].kind === "move")
      .map((side) => ({ side, move: (actions[side] as { move: Move }).move, tie: rng.next() }));
    movers.sort((x, y) => {
      const px = x.move.priority ?? 0;
      const py = y.move.priority ?? 0;
      if (px !== py) return py - px;
      const sx = effectiveSpeed(active[x.side], cfg);
      const sy = effectiveSpeed(active[y.side], cfg);
      return sy - sx || x.tie - y.tie;
    });
    for (const { side, move } of movers) {
      const user = active[side];
      const target = active[side === 0 ? 1 : 0];
      if (user.hp <= 0 || target.hp <= 0) continue;
      executeMove(user, target, move);
    }

    // End of turn: burn / poison damage.
    for (const c of active) {
      if (c.hp <= 0 || (c.status !== "burn" && c.status !== "poison")) continue;
      const fraction = c.status === "burn" ? cfg.battle.burnDamageFraction : cfg.battle.poisonDamageFraction;
      const amount = Math.min(c.hp, Math.max(1, Math.floor(c.maxHp * fraction)));
      c.hp -= amount;
      events.push({ kind: "status-damage", side: c.side, slot: c.slot, status: c.status, amount, hp: c.hp, maxHp: c.maxHp });
      if (c.hp <= 0) faint(c);
    }

    // Fainted Pokémon are replaced by the next one in entry order.
    for (const side of [0, 1] as const) {
      if (active[side].hp > 0) continue;
      const next = alive(side)[0];
      if (!next) continue;
      active[side] = next;
      events.push({ kind: "send-out", side, slot: next.slot, hp: next.hp, maxHp: next.maxHp });
    }
  }

  let winner: Side;
  if (reason === "timeout") {
    const hpShare = (side: Side) => teams[side].reduce((s, c) => s + c.hp / c.maxHp, 0);
    winner = hpShare(0) >= hpShare(1) ? 0 : 1;
  } else if (alive(0).length > 0) winner = 0;
  else if (alive(1).length > 0) winner = 1;
  else winner = faintOrder[faintOrder.length - 1] === 0 ? 0 : 1; // both wiped: the last to fall wins
  events.push({ kind: "end", winner, reason, turns: turn });

  return { winner, turns: turn, events, hpLeft: [teams[0].map((c) => c.hp), teams[1].map((c) => c.hp)] };
}
