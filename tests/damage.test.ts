import { describe, expect, it } from "vitest";
import { calcDamage, computeStats, energyCost, neutralStages, stageMultiplier, type Fighter } from "../src/engine";
import { ENERGY } from "../src/config/game";
import { bySlug } from "./helpers";

const flat = { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 };
const fighter = (types: Fighter["types"], extra: Partial<Fighter> = {}): Fighter => ({
  types,
  stats: flat,
  stages: neutralStages(),
  status: null,
  ...extra,
});
const noRandom = { random: 1, crit: false };
const tackle90 = { type: "normal", category: "physical", power: 90 } as const;

describe("stats at level 50", () => {
  it("matches the real game formula (IV 31, EV 0, neutral nature)", () => {
    expect(computeStats(bySlug("pikachu").baseStats)).toEqual({ hp: 110, atk: 75, def: 60, spa: 70, spd: 70, spe: 110 });
    expect(computeStats(bySlug("garchomp").baseStats).hp).toBe(183);
  });
});

describe("damage formula", () => {
  // floor(floor(floor(2*50/5+2) * 90 * 100/100) / 50) + 2 = 41
  it("computes the base damage", () => {
    expect(calcDamage(fighter(["fire"]), fighter(["water"]), tackle90, noRandom).damage).toBe(41);
  });

  it("applies STAB ×1.5", () => {
    expect(calcDamage(fighter(["normal"]), fighter(["water"]), tackle90, noRandom).damage).toBe(61);
  });

  it("applies type effectiveness, including immunity", () => {
    const fire = { type: "fire", category: "special", power: 90 } as const;
    expect(calcDamage(fighter(["water"]), fighter(["grass"]), fire, noRandom)).toEqual({ damage: 82, effectiveness: 2 });
    expect(calcDamage(fighter(["water"]), fighter(["grass", "steel"]), fire, noRandom).damage).toBe(164);
    expect(calcDamage(fighter(["water"]), fighter(["water"]), fire, noRandom).damage).toBe(20);
    expect(calcDamage(fighter(["water"]), fighter(["ghost"]), tackle90, noRandom)).toEqual({ damage: 0, effectiveness: 0 });
  });

  it("applies crits, burn and the random factor", () => {
    expect(calcDamage(fighter(["fire"]), fighter(["water"]), tackle90, { random: 1, crit: true }).damage).toBe(61);
    expect(calcDamage(fighter(["fire"], { status: "burn" }), fighter(["water"]), tackle90, noRandom).damage).toBe(20);
    expect(calcDamage(fighter(["fire"]), fighter(["water"]), tackle90, { random: 0.85, crit: false }).damage).toBe(34);
  });

  it("uses stat stages", () => {
    expect(stageMultiplier(1)).toBe(1.5);
    expect(stageMultiplier(-2)).toBe(0.5);
    expect(stageMultiplier(9)).toBe(4);
    const boosted = fighter(["fire"], { stages: { ...neutralStages(), atk: 2 } });
    expect(calcDamage(boosted, fighter(["water"]), tackle90, noRandom).damage).toBe(81);
  });

  it("always deals at least 1 damage when not immune", () => {
    const weak = { type: "normal", category: "physical", power: 1 } as const;
    const wall = fighter(["water"], { stats: { ...flat, def: 999 } });
    expect(calcDamage(fighter(["fire"]), wall, weak, { random: 0.85, crit: false }).damage).toBe(1);
  });
});

describe("energy cost", () => {
  it("makes small moves free and big moves expensive", () => {
    const m = (power: number, minHits = 1, maxHits = 1) => ({ power, minHits, maxHits });
    expect(energyCost(m(40))).toBe(0);
    expect(energyCost(m(20))).toBe(0);
    expect(energyCost(m(90))).toBe(25);
    expect(energyCost(m(120))).toBe(40);
    expect(energyCost(m(30, 2, 2))).toBe(10);
  });

  it("makes a 120-power move affordable on turn 2 with the default config", () => {
    expect(ENERGY.start + 2 * ENERGY.perTurn).toBeGreaterThanOrEqual(energyCost({ power: 120, minHits: 1, maxHits: 1 }));
  });
});
