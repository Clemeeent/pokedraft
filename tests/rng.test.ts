import { describe, expect, it } from "vitest";
import { createRng, weightedIndex } from "../src/engine";

describe("seeded RNG", () => {
  it("gives the same sequence for the same seed", () => {
    const a = createRng("2026-10-09|player-1");
    const b = createRng("2026-10-09|player-1");
    expect(Array.from({ length: 20 }, a.next)).toEqual(Array.from({ length: 20 }, b.next));
  });

  it("gives different sequences for different seeds", () => {
    const a = createRng("seed-a");
    const b = createRng("seed-b");
    expect(Array.from({ length: 5 }, a.next)).not.toEqual(Array.from({ length: 5 }, b.next));
  });

  it("int() stays within bounds and covers them", () => {
    const rng = createRng("bounds");
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = rng.int(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect(seen.size).toBe(6);
  });

  it("weightedIndex never picks a zero weight", () => {
    const rng = createRng("weights");
    for (let i = 0; i < 500; i++) expect(weightedIndex(rng, [0, 1, 0, 3])).not.toBe(0);
    expect(weightedIndex(rng, [0, 0])).toBe(-1);
  });
});
