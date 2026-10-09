/**
 * Downloads the pixel-art sprites (Pokémon Showdown "gen5" style, from the smogon/sprites
 * repository) into public/sprites/ so the game hosts them itself (no hotlinking).
 * Animated GIF for gens 1–5, static PNG in the same style for newer Pokémon.
 * Fallback: PokéAPI's default sprite. Already downloaded files are skipped.
 *
 *   npm run sprites
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SHOWDOWN = "https://raw.githubusercontent.com/smogon/sprites/master/src/sprites/gen5";
const POKEAPI = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const OUT = path.join(process.cwd(), "public", "sprites");
const MANIFEST = path.join(process.cwd(), "data", "sprites.json");
const CONCURRENCY = 16;

interface SpriteEntry {
  /** File extension of the normal and shiny sprite. */
  ext: "gif" | "png";
  source: "showdown" | "pokeapi";
}

/** File name used by smogon/sprites: "Mr. Mime" → "mr_mime", "Ho-Oh" → "ho_oh", "Nidoran♀" → "nidoran_f". */
function showdownId(name: string): string {
  return name
    .replace("♀", "-f")
    .replace("♂", "-m")
    .normalize("NFD")
    .toLowerCase()
    .replace(/[ -]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

async function download(url: string): Promise<Buffer | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch {
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  throw new Error(`Failed to download ${url}`);
}

async function fetchOne(id: number, name: string, known?: SpriteEntry): Promise<SpriteEntry> {
  const target = (shiny: boolean, ext: string) => path.join(OUT, shiny ? "shiny" : "", `${id}.${ext}`);
  if (known && existsSync(target(false, known.ext)) && existsSync(target(true, known.ext))) return known;

  const sdId = showdownId(name);
  for (const ext of ["gif", "png"] as const) {
    const normal = await download(`${SHOWDOWN}/s${sdId}.${ext}`);
    if (!normal) continue;
    const shiny = await download(`${SHOWDOWN}/s${sdId}-s.${ext}`);
    await writeFile(target(false, ext), normal);
    if (shiny) await writeFile(target(true, ext), shiny);
    else await writeFile(target(true, ext), normal);
    return { ext, source: "showdown" };
  }
  const normal = await download(`${POKEAPI}/${id}.png`);
  if (!normal) throw new Error(`No sprite at all for #${id} ${name}`);
  const shiny = await download(`${POKEAPI}/shiny/${id}.png`);
  await writeFile(target(false, "png"), normal);
  await writeFile(target(true, "png"), shiny ?? normal);
  return { ext: "png", source: "pokeapi" };
}

async function main() {
  await mkdir(path.join(OUT, "shiny"), { recursive: true });
  const species: { id: number; name: string }[] = JSON.parse(
    await readFile(path.join(process.cwd(), "data", "pokemon.json"), "utf8"),
  );
  const previous: Record<string, SpriteEntry> = existsSync(MANIFEST)
    ? JSON.parse(await readFile(MANIFEST, "utf8"))
    : {};

  const manifest: Record<string, SpriteEntry> = {};
  let next = 0;
  let done = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < species.length) {
        const s = species[next++];
        manifest[s.id] = await fetchOne(s.id, s.name, previous[s.id]);
        if (++done % 100 === 0) console.log(`  ${done}/${species.length}`);
      }
    }),
  );

  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => Number(a) - Number(b)));
  await writeFile(MANIFEST, JSON.stringify(sorted, null, 0));
  const entries = Object.values(manifest);
  const fallback = species.filter((s) => manifest[s.id].source === "pokeapi").map((s) => s.name);
  console.log(
    `Sprites: ${entries.length}/${species.length} (animated ${entries.filter((e) => e.ext === "gif").length}, ` +
      `PokéAPI fallback: ${fallback.join(", ") || "none"})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
