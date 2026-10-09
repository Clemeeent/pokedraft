import { describe, expect, it } from "vitest";
import { DRAFT } from "../src/config/game";
import {
  chooseRerollOption,
  daySeed,
  DraftError,
  drawRoster,
  isLegendary,
  lockTeam,
  playDraftAsBot,
  rerollOptions,
  setTeam,
  startDraft,
  startReroll,
} from "../src/engine";
import { dex } from "./helpers";

const pool = dex.species;
const day = daySeed("2026-10-09", "all");
const start = (player = "player-1") => startDraft(pool, "2026-10-09", day, player);
const species = (id: number) => dex.speciesById.get(id)!;

describe("roster draw", () => {
  it("draws 6 distinct Pokémon with at most 1 legendary", () => {
    for (let i = 0; i < 300; i++) {
      const roster = drawRoster(pool, `roster-${i}`);
      expect(roster).toHaveLength(DRAFT.rosterSize);
      expect(new Set(roster.map((r) => r.speciesId)).size).toBe(DRAFT.rosterSize);
      expect(roster.filter((r) => isLegendary(species(r.speciesId))).length).toBeLessThanOrEqual(1);
    }
  });

  it("is reproducible for the same player and day, different between players", () => {
    expect(start("alice").roster).toEqual(start("alice").roster);
    expect(start("alice").roster).not.toEqual(start("bob").roster);
  });

  it("is different on another day", () => {
    const other = startDraft(pool, "2026-10-10", daySeed("2026-10-10", "all"), "alice");
    expect(other.roster).not.toEqual(start("alice").roster);
  });

  it("makes legendaries rarer than regular Pokémon", () => {
    let legends = 0;
    for (let i = 0; i < 500; i++) legends += drawRoster(pool, `rarity-${i}`).filter((r) => isLegendary(species(r.speciesId))).length;
    const legendShare = pool.filter(isLegendary).length / pool.length; // ~9%
    expect(legends / (500 * 6)).toBeLessThan(legendShare * 0.6);
  });
});

describe("rerolls", () => {
  it("offers 3 options matching the constraint, never already in the roster", () => {
    const s = start();
    for (let slot = 0; slot < 6; slot++) {
      const replaced = species(s.roster[slot].speciesId);
      const sameType = rerollOptions(s, pool, slot, "sameType");
      expect(sameType).toHaveLength(3);
      for (const o of sameType) {
        expect(species(o.speciesId).types.some((t) => replaced.types.includes(t))).toBe(true);
        expect(s.roster.some((r) => r.speciesId === o.speciesId)).toBe(false);
      }
      for (const o of rerollOptions(s, pool, slot, "sameGeneration")) {
        expect(species(o.speciesId).generation).toBe(replaced.generation);
      }
    }
  });

  it("is deterministic (no refresh) and spends rerolls", () => {
    const s = start();
    expect(rerollOptions(s, pool, 0, "free")).toEqual(rerollOptions(s, pool, 0, "free"));
    const afterType = startReroll(s, pool, 0, "sameType");
    expect(afterType.rerollsLeft).toBe(DRAFT.rerollsPerDay - 1);
    const afterFree = startReroll(s, pool, 0, "free");
    expect(afterFree.rerollsLeft).toBe(DRAFT.rerollsPerDay - 2);
  });

  it("replaces the slot with the chosen option and records the history", () => {
    let s = setTeam(start(), [0, 1, 2]);
    s = startReroll(s, pool, 1, "sameGeneration");
    const option = s.pending!.options[2];
    s = chooseRerollOption(s, 2);
    expect(s.roster[1]).toEqual(option);
    expect(s.pending).toBeNull();
    expect(s.rerolls).toHaveLength(1);
    expect(s.team).toEqual([0, 2]);
  });

  it("refuses rerolls without enough budget, or while one is pending", () => {
    let s = start();
    expect(() => startReroll(startReroll(s, pool, 0, "sameType"), pool, 1, "sameType")).toThrow(DraftError);
    for (let i = 0; i < 3; i++) s = chooseRerollOption(startReroll(s, pool, i, "sameType"), 0);
    expect(s.rerollsLeft).toBe(0);
    expect(() => startReroll(s, pool, 0, "sameType")).toThrow(DraftError);
  });

  it("keeps the legendary cap after rerolls", () => {
    for (let p = 0; p < 40; p++) {
      let s = start(`cap-${p}`);
      s = chooseRerollOption(startReroll(s, pool, 0, "free"), 0);
      s = chooseRerollOption(startReroll(s, pool, 1, "sameType"), 0);
      expect(s.roster.filter((r) => isLegendary(species(r.speciesId))).length).toBeLessThanOrEqual(1);
      expect(new Set(s.roster.map((r) => r.speciesId)).size).toBe(6);
    }
  });
});

describe("team selection and lock", () => {
  it("requires exactly 3 distinct Pokémon to lock", () => {
    const s = start();
    expect(() => lockTeam(setTeam(s, [0, 1]))).toThrow(DraftError);
    expect(() => setTeam(s, [0, 0, 1])).toThrow(DraftError);
    expect(() => setTeam(s, [0, 1, 2, 3])).toThrow(DraftError);
    const locked = lockTeam(setTeam(s, [3, 1, 5]));
    expect(locked.locked).toBe(true);
    expect(locked.team).toEqual([3, 1, 5]);
  });

  it("forbids any change after lock", () => {
    const locked = lockTeam(setTeam(start(), [0, 1, 2]));
    expect(() => setTeam(locked, [3, 4, 5])).toThrow(DraftError);
    expect(() => startReroll(locked, pool, 0, "sameType")).toThrow(DraftError);
  });

  it("bots play a complete legal draft", () => {
    const bot = playDraftAsBot(dex, pool, "2026-10-09", day, "bot-0");
    expect(bot.locked).toBe(true);
    expect(bot.team).toHaveLength(3);
    expect(bot.rerollsLeft).toBeGreaterThanOrEqual(0);
  });
});
