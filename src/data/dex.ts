import movesJson from "../../data/moves.json";
import pokemonJson from "../../data/pokemon.json";
import spritesJson from "../../data/sprites.json";
import { createDex, type Move, type Species } from "@/engine";

export const dex = createDex(pokemonJson as Species[], movesJson as Move[]);

/** Phase 1: the pool is every Pokémon (themes come in phase 3). */
export const dayPool: Species[] = dex.species;

const sprites = spritesJson as Record<string, { ext: string }>;

export function spriteUrl(speciesId: number, shiny = false): string {
  const ext = sprites[speciesId]?.ext ?? "png";
  return `/sprites/${shiny ? "shiny/" : ""}${speciesId}.${ext}`;
}
