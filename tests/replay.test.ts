import { describe, expect, it } from "vitest";
import { simulateBattle } from "../src/engine";
import { buildReplay } from "../src/lib/replay";
import { dex, team } from "./helpers";

describe("replay frames", () => {
  it("follow the battle log and end on the result", () => {
    const teams = [team("You", "charizard", "pikachu", "gengar"), team("Bot", "blastoise", "snorlax", "alakazam")] as const;
    const r = simulateBattle(teams[0], teams[1], "replay", dex);
    const frames = buildReplay(r.events, [teams[0], teams[1]], dex);
    expect(frames.length).toBeGreaterThan(5);
    expect(frames[0].message).toBe("Go! Charizard!");
    expect(frames.at(-1)!.message).toMatch(r.winner === 0 ? /defeated|win/ : /lost|lose/);
    for (const f of frames) for (const side of f.teams) for (const m of side) expect(m.hp).toBeGreaterThanOrEqual(0);
    const last = frames.at(-1)!;
    expect(last.teams[1 - r.winner].every((m) => m.fainted || r.events.at(-1)!.kind === "end")).toBe(true);
  });
});
