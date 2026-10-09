import type { TypeName } from "./types";

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export type StatKey = keyof BaseStats;
export type MoveCategory = "physical" | "special";
export type Ailment = "burn" | "paralysis" | "poison";

export interface Move {
  id: number;
  slug: string;
  name: string;
  type: TypeName;
  category: MoveCategory;
  power: number;
  /** null = never misses. */
  accuracy: number | null;
  priority: number;
  ailment: Ailment | null;
  ailmentChance: number;
  /** Stat stage changes; applied to the user if `selfTarget`, otherwise to the target. */
  statChanges: { stat: Exclude<StatKey, "hp">; change: number }[];
  statChance: number;
  selfTarget: boolean;
  /** % of damage dealt healed (positive) or taken as recoil (negative). */
  drain: number;
  minHits: number;
  maxHits: number;
  highCrit: boolean;
}

export interface Species {
  id: number;
  slug: string;
  name: string;
  generation: number;
  types: TypeName[];
  baseStats: BaseStats;
  bst: number;
  isLegendary: boolean;
  isMythical: boolean;
  isBaby: boolean;
  evolvesFrom: string | null;
  /** The 4 (or fewer) move ids chosen by the moveset builder. */
  moves: number[];
}

/** Static data the engine works on. Passed in, never imported, so the engine stays pure. */
export interface Dex {
  species: Species[];
  speciesById: Map<number, Species>;
  movesById: Map<number, Move>;
  struggle: Move;
}

export function createDex(species: Species[], moves: Move[], struggleId = 165): Dex {
  const movesById = new Map(moves.map((m) => [m.id, m]));
  const struggle = movesById.get(struggleId);
  if (!struggle) throw new Error("Struggle missing from move data");
  return { species, speciesById: new Map(species.map((s) => [s.id, s])), movesById, struggle };
}

export const isLegendary = (s: Species) => s.isLegendary || s.isMythical;
