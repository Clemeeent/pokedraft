import { describe, expect, it } from "vitest";
import { simulateBattle } from "../src/engine";
import { battleTimeline, faintedAt, scoreAt } from "../src/lib/liveScore";
import { dex, team } from "./helpers";

describe("live score timeline", () => {
  it("counts knock-outs like goals and ends on the battle result", () => {
    for (let i = 0; i < 20; i++) {
      const r = simulateBattle(team("A", "charizard", "pikachu", "gengar"), team("B", "blastoise", "snorlax", "alakazam"), `live-${i}`, dex);
      const tl = battleTimeline(r.events);
      expect(tl.winner).toBe(r.winner);
      expect(scoreAt(tl, 0)).toEqual([0, 0]);
      const [mine, theirs] = scoreAt(tl, tl.turns);
      if (tl.reason === "ko") expect(r.winner === 0 ? mine : theirs).toBe(3);
      expect(faintedAt(tl, tl.turns)[1].size).toBe(mine);
      const turns = tl.knockOuts.map((k) => k.turn);
      expect([...turns].sort((a, b) => a - b)).toEqual(turns);
    }
  });
});
