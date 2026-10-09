import { BATTLE, ENERGY } from "../config/game";
import type { BaseStats, Move } from "./model";

/** Real game formula (gen 3+), neutral nature. */
export function computeStats(base: BaseStats, cfg: { level: number; iv: number; ev: number } = BATTLE): BaseStats {
  const { level, iv, ev } = cfg;
  const core = (b: number) => Math.floor(((2 * b + iv + Math.floor(ev / 4)) * level) / 100);
  return {
    hp: core(base.hp) + level + 10,
    atk: core(base.atk) + 5,
    def: core(base.def) + 5,
    spa: core(base.spa) + 5,
    spd: core(base.spd) + 5,
    spe: core(base.spe) + 5,
  };
}

export function baseStatTotal(b: BaseStats): number {
  return b.hp + b.atk + b.def + b.spa + b.spd + b.spe;
}

/** Average number of hits of a multi-hit move (2–5 hits uses the real distribution: 3.1). */
export function averageHits(move: Pick<Move, "minHits" | "maxHits">): number {
  if (move.minHits === 2 && move.maxHits === 5) return 3.1;
  return (move.minHits + move.maxHits) / 2;
}

/** Energy cost of a move: free up to `freePower`, then proportional to power. */
export function energyCost(move: Pick<Move, "power" | "minHits" | "maxHits">, cfg: typeof ENERGY = ENERGY): number {
  const totalPower = move.power * averageHits(move);
  return Math.max(0, Math.round((totalPower - cfg.freePower) * cfg.costPerPower));
}
