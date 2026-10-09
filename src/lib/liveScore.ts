import type { BattleEvent, Side } from "@/engine";

export interface KnockOut {
  turn: number;
  /** Side of the Pokémon that fainted. */
  side: Side;
  slot: number;
  /** The opposing Pokémon that landed the last hit (null for burn/poison/recoil). */
  by: { side: Side; slot: number } | null;
}

export interface BattleTimeline {
  turns: number;
  knockOuts: KnockOut[];
  winner: Side;
  reason: "ko" | "timeout";
}

/** Condenses a battle log into what a live-score row needs: when each Pokémon fell. */
export function battleTimeline(events: BattleEvent[]): BattleTimeline {
  let turn = 0;
  let lastMove: { side: Side; slot: number } | null = null;
  const knockOuts: KnockOut[] = [];
  let end: Extract<BattleEvent, { kind: "end" }> | null = null;
  for (const e of events) {
    if (e.kind === "turn") {
      turn = e.turn;
      lastMove = null;
    } else if (e.kind === "move") lastMove = { side: e.side, slot: e.slot };
    else if (e.kind === "status-damage") lastMove = null;
    else if (e.kind === "faint") {
      const by = lastMove && lastMove.side !== e.side ? lastMove : null;
      knockOuts.push({ turn, side: e.side, slot: e.slot, by });
    } else if (e.kind === "end") end = e;
  }
  if (!end) throw new Error("Battle log has no end event");
  return { turns: end.turns, knockOuts, winner: end.winner, reason: end.reason };
}

/** Knock-outs scored by each side up to (and including) `turn`, like a football score. */
export function scoreAt(timeline: BattleTimeline, turn: number): [number, number] {
  const ko = timeline.knockOuts.filter((k) => k.turn <= turn);
  return [ko.filter((k) => k.side === 1).length, ko.filter((k) => k.side === 0).length];
}

/** Which team members have fainted by `turn`, per side. */
export function faintedAt(timeline: BattleTimeline, turn: number): [Set<number>, Set<number>] {
  const out: [Set<number>, Set<number>] = [new Set(), new Set()];
  for (const k of timeline.knockOuts) if (k.turn <= turn) out[k.side].add(k.slot);
  return out;
}
