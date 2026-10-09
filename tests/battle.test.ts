import { describe, expect, it } from "vitest";
import { energyCost, simulateBattle, summarizeBattle, type BattleEvent } from "../src/engine";
import { dex, team } from "./helpers";

const fire = team("Fire", "charizard", "arcanine", "ninetales");
const water = team("Water", "blastoise", "vaporeon", "starmie");

describe("battle engine", () => {
  it("is deterministic: same seed = same battle", () => {
    const a = simulateBattle(fire, water, "seed-42", dex);
    const b = simulateBattle(fire, water, "seed-42", dex);
    expect(a).toEqual(b);
  });

  it("changes with the seed", () => {
    const logs = new Set(Array.from({ length: 10 }, (_, i) => JSON.stringify(simulateBattle(fire, water, `seed-${i}`, dex).events)));
    expect(logs.size).toBeGreaterThan(1);
  });

  it("always ends with a winner and a coherent log", () => {
    for (let i = 0; i < 30; i++) {
      const r = simulateBattle(fire, water, `log-${i}`, dex);
      const end = r.events[r.events.length - 1];
      expect(end.kind).toBe("end");
      const loser = r.winner === 0 ? 1 : 0;
      if (end.kind === "end" && end.reason === "ko") {
        expect(r.hpLeft[loser].every((hp) => hp === 0)).toBe(true);
        expect(r.events.filter((e) => e.kind === "faint" && e.side === loser).length).toBe(3);
      }
      for (const e of r.events) if ("hp" in e) expect(e.hp).toBeGreaterThanOrEqual(0);
    }
  });

  it("makes type matchups matter: Water beats Fire most of the time", () => {
    let waterWins = 0;
    for (let i = 0; i < 100; i++) {
      if (simulateBattle(fire, water, `types-${i}`, dex).winner === 1) waterWins++;
    }
    expect(waterWins).toBeGreaterThan(65);
  });

  it("makes raw power matter: legendaries crush unevolved Pokémon", () => {
    const strong = team("Strong", "mewtwo", "rayquaza", "dialga");
    const weak = team("Weak", "caterpie", "weedle", "pidgey");
    for (let i = 0; i < 20; i++) expect(simulateBattle(strong, weak, `power-${i}`, dex).winner).toBe(0);
  });

  it("never spends more energy than available", () => {
    for (let i = 0; i < 20; i++) {
      const r = simulateBattle(fire, water, `energy-${i}`, dex);
      for (const e of r.events) if (e.kind === "move") expect(e.energyLeft).toBeGreaterThanOrEqual(0);
    }
  });

  it("only uses expensive moves after saving energy", () => {
    const r = simulateBattle(fire, water, "energy-turn1", dex);
    const firstMoves = r.events.slice(0, r.events.findIndex((e) => e.kind === "turn" && e.turn === 2)).filter((e) => e.kind === "move");
    for (const e of firstMoves) {
      if (e.kind === "move") expect(energyCost(dex.movesById.get(e.moveId)!)).toBeLessThanOrEqual(20);
    }
  });

  it("uses Struggle when a Pokémon has no damaging move", () => {
    const r = simulateBattle(team("Ditto", "ditto", "ditto", "ditto"), team("Pikachu", "pikachu", "pikachu", "pikachu"), "struggle", dex);
    const dittoMoves = r.events.filter((e): e is Extract<BattleEvent, { kind: "move" }> => e.kind === "move" && e.side === 0);
    expect(dittoMoves.length).toBeGreaterThan(0);
    expect(dittoMoves.every((e) => e.moveId === dex.struggle.id)).toBe(true);
    expect(r.winner).toBe(1);
  });

  it("switches out of a very bad matchup", () => {
    // Manectric (Electric moves only, useless vs Ground) leads against Golem, Blastoise waits on the bench.
    const r = simulateBattle(team("A", "manectric", "blastoise", "venusaur"), team("B", "golem", "rhydon", "onix"), "switch", dex);
    expect(r.events.some((e) => e.kind === "switch" && e.side === 0)).toBe(true);
  });

  it("produces a key-moment summary", () => {
    const r = simulateBattle(fire, water, "summary", dex);
    const s = summarizeBattle(r.events, [fire, water], dex);
    expect(s.text.length).toBeGreaterThan(10);
  });
});
