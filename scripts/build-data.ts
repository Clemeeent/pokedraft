/**
 * Offline step: data/source/*.json (raw PokéAPI extract) → data/pokemon.json + data/moves.json
 * (the compact files the game loads), choosing each Pokémon's 4 moves.
 *
 *   npm run data:build
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Ailment, Move, Species, StatKey } from "../src/engine/model";
import { selectMoveset } from "../src/engine/moveset";
import { baseStatTotal } from "../src/engine/stats";
import type { TypeName } from "../src/engine/types";

const DATA = path.join(process.cwd(), "data");
const STRUGGLE_ID = 165;

const STAT_MAP: Record<string, Exclude<StatKey, "hp">> = {
  attack: "atk",
  defense: "def",
  "special-attack": "spa",
  "special-defense": "spd",
  speed: "spe",
};
const AILMENTS = new Set(["burn", "paralysis", "poison"]);

async function main() {
  const rawPokemon = JSON.parse(await readFile(path.join(DATA, "source", "pokemon.json"), "utf8"));
  const rawMoves = JSON.parse(await readFile(path.join(DATA, "source", "moves.json"), "utf8"));

  const moves = new Map<number, Move>();
  for (const m of rawMoves) {
    if (m.category === "status" || !m.power) continue;
    moves.set(m.id, {
      id: m.id,
      slug: m.slug,
      name: m.name,
      type: m.type as TypeName,
      category: m.category,
      power: m.power,
      accuracy: m.accuracy,
      priority: m.priority,
      ailment: AILMENTS.has(m.ailment) ? (m.ailment as Ailment) : null,
      ailmentChance: m.ailmentChance,
      statChanges: m.statChanges
        .filter((s: { stat: string }) => STAT_MAP[s.stat])
        .map((s: { stat: string; change: number }) => ({ stat: STAT_MAP[s.stat], change: s.change })),
      statChance: m.statChance,
      selfTarget: m.metaCategory === "damage-raise",
      drain: m.drain,
      minHits: m.minHits ?? 1,
      maxHits: m.maxHits ?? 1,
      highCrit: m.critRate > 0,
    });
  }

  const usedMoves = new Set<number>([STRUGGLE_ID]);
  const species: Species[] = rawPokemon.map((p: any) => {
    const learnset = (p.learnset as number[]).map((id) => moves.get(id)).filter((m): m is Move => !!m);
    const moveset = selectMoveset({ types: p.types, baseStats: p.baseStats, learnset });
    moveset.forEach((m) => usedMoves.add(m.id));
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      generation: p.generation,
      types: p.types,
      baseStats: p.baseStats,
      bst: baseStatTotal(p.baseStats),
      isLegendary: p.isLegendary,
      isMythical: p.isMythical,
      isBaby: p.isBaby,
      evolvesFrom: p.evolvesFrom,
      moves: moveset.map((m) => m.id),
    } satisfies Species;
  });

  const usedMoveList = [...usedMoves].sort((a, b) => a - b).map((id) => moves.get(id)!);
  await writeFile(path.join(DATA, "pokemon.json"), JSON.stringify(species));
  await writeFile(path.join(DATA, "moves.json"), JSON.stringify(usedMoveList));

  const noMoves = species.filter((s) => s.moves.length === 0).map((s) => s.name);
  console.log(`${species.length} Pokémon, ${usedMoveList.length} moves → data/`);
  console.log(`Pokémon with no damaging move (they use Struggle): ${noMoves.join(", ") || "none"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
