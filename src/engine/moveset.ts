import { MOVESET } from "../config/game";
import type { BaseStats, Move } from "./model";
import { averageHits, energyCost } from "./stats";
import type { TypeName } from "./types";

interface MovesetInput {
  types: readonly TypeName[];
  baseStats: BaseStats;
  learnset: readonly Move[];
}

/**
 * Deterministically picks up to 4 moves giving the Pokémon a clear profile:
 * best STAB of each type, best coverage move, a free (0 energy) move, then the best remaining.
 */
export function selectMoveset({ types, baseStats, learnset }: MovesetInput, cfg = MOVESET): Move[] {
  const excluded = new Set<string>(cfg.excludedMoves);
  const bestAttack = Math.max(baseStats.atk, baseStats.spa);
  const statFactor = (m: Move) =>
    Math.max(cfg.offStatFactorFloor, (m.category === "physical" ? baseStats.atk : baseStats.spa) / bestAttack);
  const isStab = (m: Move) => types.includes(m.type);
  const score = (m: Move) =>
    m.power * averageHits(m) * ((m.accuracy ?? 100) / 100) * statFactor(m) * (isStab(m) ? 1.5 : 1);

  const candidates = learnset
    .filter((m) => m.power > 0 && !excluded.has(m.slug))
    .sort((a, b) => score(b) - score(a) || a.id - b.id);

  const chosen: Move[] = [];
  const take = (pick: Move | undefined) => {
    if (pick && chosen.length < cfg.movesPerPokemon && !chosen.includes(pick)) chosen.push(pick);
  };
  const available = () => candidates.filter((m) => !chosen.includes(m));

  for (const type of types) take(available().find((m) => m.type === type));
  // Coverage: a non-STAB type (Normal never hits anything super effectively, so it doesn't count).
  take(available().find((m) => !isStab(m) && m.type !== "normal" && !chosen.some((c) => c.type === m.type)));
  if (!chosen.some((m) => energyCost(m) === 0)) {
    take(available().find((m) => energyCost(m) === 0));
  }
  while (chosen.length < cfg.movesPerPokemon && available().length > 0) take(available()[0]);

  return chosen.sort((a, b) => energyCost(a) - energyCost(b) || a.id - b.id);
}
