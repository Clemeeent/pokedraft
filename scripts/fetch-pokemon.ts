/* eslint-disable @typescript-eslint/no-explicit-any -- raw PokéAPI JSON is untyped */
/**
 * Downloads Pokémon data once from PokéAPI (static mirror on GitHub, no rate limit)
 * and writes compact source files to data/source/.
 *
 *   npm run data:fetch
 *
 * Afterwards run `npm run data:build` (offline) to produce data/pokemon.json and data/moves.json.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "https://raw.githubusercontent.com/PokeAPI/api-data/master/data/api/v2";
const SPECIES_COUNT = 1025;
const CONCURRENCY = 24;
const STRUGGLE_ID = 165;
const IGNORED_VERSION_GROUPS = ["legends-arceus", "legends-za", "mega-dimension", "champions", "colosseum", "xd"];
const OUT_DIR = path.join(process.cwd(), "data", "source");

type NamedRef = { name: string; url: string };

async function getJson<T>(url: string, attempt = 1): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return (await res.json()) as T;
  } catch (err) {
    if (attempt >= 4) throw err;
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    return getJson<T>(url, attempt + 1);
  }
}

async function mapPool<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
      done++;
      if (done % 100 === 0) console.log(`  ${done}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

const idFromUrl = (url: string) => Number(url.split("/").filter(Boolean).pop());
const englishName = (names: { name: string; language: NamedRef }[], fallback: string) =>
  names.find((n) => n.language.name === "en")?.name ?? fallback;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log("Version groups…");
  const vgIndex = await getJson<{ results: NamedRef[] }>(`${BASE}/version-group/index.json`);
  const versionGroups = await mapPool(vgIndex.results, async (ref) => {
    const vg = await getJson<{ name: string; generation: NamedRef }>(`${BASE}/version-group/${idFromUrl(ref.url)}/index.json`);
    return { name: vg.name, generation: idFromUrl(vg.generation.url) };
  });
  // Spin-off games with partial or unusual learnsets are ignored.
  const vgGeneration = new Map(
    versionGroups.filter((v) => !IGNORED_VERSION_GROUPS.includes(v.name)).map((v) => [v.name, v.generation]),
  );

  console.log("Species + Pokémon…");
  const ids = Array.from({ length: SPECIES_COUNT }, (_, i) => i + 1);
  const moveIds = new Set<number>();
  const pokemon = await mapPool(ids, async (id) => {
    const species = await getJson<any>(`${BASE}/pokemon-species/${id}/index.json`);
    const defaultVariety = species.varieties.find((v: any) => v.is_default).pokemon as NamedRef;
    const mon = await getJson<any>(`${BASE}/pokemon/${idFromUrl(defaultVariety.url)}/index.json`);
    const stat = (name: string) => mon.stats.find((s: any) => s.stat.name === name).base_stat as number;

    // Learnset = every move learnable (any method) in the most recent main-series generation
    // the Pokémon appears in (e.g. Scarlet/Violet + its DLCs).
    const gensOf = (m: any): number[] =>
      m.version_group_details.map((d: any) => vgGeneration.get(d.version_group.name) ?? -1);
    const latestGen = Math.max(-1, ...mon.moves.flatMap(gensOf));
    const learnset = mon.moves
      .filter((m: any) => gensOf(m).includes(latestGen))
      .map((m: any) => idFromUrl(m.move.url));
    learnset.forEach((m: number) => moveIds.add(m));

    return {
      id,
      slug: species.name as string,
      name: englishName(species.names, species.name),
      generation: idFromUrl(species.generation.url),
      types: mon.types.sort((a: any, b: any) => a.slot - b.slot).map((t: any) => t.type.name as string),
      baseStats: {
        hp: stat("hp"),
        atk: stat("attack"),
        def: stat("defense"),
        spa: stat("special-attack"),
        spd: stat("special-defense"),
        spe: stat("speed"),
      },
      isLegendary: species.is_legendary as boolean,
      isMythical: species.is_mythical as boolean,
      isBaby: species.is_baby as boolean,
      evolvesFrom: (species.evolves_from_species?.name ?? null) as string | null,
      learnset: learnset.sort((a: number, b: number) => a - b),
    };
  });

  moveIds.add(STRUGGLE_ID); // engine fallback when nothing else is usable
  console.log(`Moves (${moveIds.size})…`);
  const moves = await mapPool([...moveIds].sort((a, b) => a - b), async (id) => {
    const m = await getJson<any>(`${BASE}/move/${id}/index.json`);
    return {
      id: m.id as number,
      slug: m.name as string,
      name: englishName(m.names, m.name),
      type: m.type.name as string,
      category: m.damage_class.name as "physical" | "special" | "status",
      power: m.power as number | null,
      accuracy: m.accuracy as number | null,
      priority: m.priority as number,
      target: m.target.name as string,
      metaCategory: (m.meta?.category?.name ?? null) as string | null,
      ailment: (m.meta?.ailment?.name ?? "none") as string,
      ailmentChance: (m.meta?.ailment_chance ?? 0) as number,
      statChance: (m.meta?.stat_chance ?? 0) as number,
      statChanges: m.stat_changes.map((s: any) => ({ stat: s.stat.name as string, change: s.change as number })),
      drain: (m.meta?.drain ?? 0) as number,
      minHits: (m.meta?.min_hits ?? null) as number | null,
      maxHits: (m.meta?.max_hits ?? null) as number | null,
      critRate: (m.meta?.crit_rate ?? 0) as number,
      flinchChance: (m.meta?.flinch_chance ?? 0) as number,
    };
  });

  await writeFile(path.join(OUT_DIR, "pokemon.json"), JSON.stringify(pokemon));
  await writeFile(path.join(OUT_DIR, "moves.json"), JSON.stringify(moves));
  console.log(`Done: ${pokemon.length} Pokémon, ${moves.length} moves → data/source/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
