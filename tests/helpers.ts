import movesJson from "../data/moves.json";
import pokemonJson from "../data/pokemon.json";
import { createDex, type Move, type Species } from "../src/engine";

export const dex = createDex(pokemonJson as Species[], movesJson as Move[]);
export const bySlug = (slug: string): Species => {
  const s = dex.species.find((x) => x.slug === slug);
  if (!s) throw new Error(`No species ${slug}`);
  return s;
};
export const team = (name: string, ...slugs: string[]) => ({
  name,
  members: slugs.map((slug) => ({ speciesId: bySlug(slug).id, shiny: false })),
});
