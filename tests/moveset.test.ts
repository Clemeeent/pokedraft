import { describe, expect, it } from "vitest";
import { MOVESET } from "../src/config/game";
import { energyCost } from "../src/engine";
import { bySlug, dex } from "./helpers";

describe("movesets", () => {
  it("gives every Pokémon at most 4 distinct damaging moves", () => {
    for (const s of dex.species) {
      expect(s.moves.length).toBeLessThanOrEqual(4);
      expect(new Set(s.moves).size).toBe(s.moves.length);
      for (const id of s.moves) expect(dex.movesById.get(id)!.power).toBeGreaterThan(0);
    }
  });

  it("never picks excluded moves", () => {
    const excluded = new Set<string>(MOVESET.excludedMoves);
    for (const s of dex.species) for (const id of s.moves) expect(excluded.has(dex.movesById.get(id)!.slug)).toBe(false);
  });

  it("gives a STAB move and a free move to fully evolved Pokémon", () => {
    for (const slug of ["charizard", "blastoise", "venusaur", "gengar", "garchomp", "lucario", "meowscarada"]) {
      const moves = bySlug(slug).moves.map((id) => dex.movesById.get(id)!);
      const types = bySlug(slug).types;
      expect(moves.some((m) => types.includes(m.type)), slug).toBe(true);
      expect(moves.some((m) => energyCost(m) === 0), slug).toBe(true);
    }
  });

  it("is deterministic data: Charizard keeps a Fire STAB move", () => {
    const moves = bySlug("charizard").moves.map((id) => dex.movesById.get(id)!);
    expect(moves.filter((m) => m.type === "fire").length).toBeGreaterThanOrEqual(1);
  });
});
