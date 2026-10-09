import { BATTLE } from "../config/game";
import type { Ailment, BaseStats, Move, StatKey } from "./model";
import { typeEffectiveness, type TypeName } from "./types";

export type StatStages = Record<Exclude<StatKey, "hp">, number>;

export const neutralStages = (): StatStages => ({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });

/** Real game stage multiplier: +1 = ×1.5, +2 = ×2, −1 = ×0.67… (stages clamped to ±6). */
export function stageMultiplier(stage: number): number {
  const s = Math.max(-6, Math.min(6, stage));
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}

export interface Fighter {
  types: readonly TypeName[];
  stats: BaseStats;
  stages: StatStages;
  status: Ailment | null;
}

export interface DamageRoll {
  /** Random factor in [1 - variance, 1]. */
  random: number;
  crit: boolean;
}

/** Damage of one hit (real gen 5+ formula, simplified: no abilities, items or weather). */
export function calcDamage(
  attacker: Fighter,
  defender: Fighter,
  move: Pick<Move, "type" | "category" | "power">,
  roll: DamageRoll,
  cfg: Pick<typeof BATTLE, "level" | "critMultiplier" | "stabMultiplier" | "burnPhysicalMultiplier"> = BATTLE,
): { damage: number; effectiveness: number } {
  const effectiveness = typeEffectiveness(move.type, defender.types);
  if (effectiveness === 0) return { damage: 0, effectiveness };

  const physical = move.category === "physical";
  const attack = (physical ? attacker.stats.atk : attacker.stats.spa) * stageMultiplier(physical ? attacker.stages.atk : attacker.stages.spa);
  const defense = (physical ? defender.stats.def : defender.stats.spd) * stageMultiplier(physical ? defender.stages.def : defender.stages.spd);

  const base = Math.floor(Math.floor((Math.floor((2 * cfg.level) / 5 + 2) * move.power * attack) / defense) / 50) + 2;
  let modifier = roll.random * effectiveness;
  if (roll.crit) modifier *= cfg.critMultiplier;
  if (attacker.types.includes(move.type)) modifier *= cfg.stabMultiplier;
  if (physical && attacker.status === "burn") modifier *= cfg.burnPhysicalMultiplier;

  return { damage: Math.max(1, Math.floor(base * modifier)), effectiveness };
}
