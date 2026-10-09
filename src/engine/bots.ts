import { BOTS, DRAFT } from "../config/game";
import { chooseRerollOption, lockTeam, setTeam, startDraft, startReroll, type DraftState } from "./draft";
import type { Dex, Species } from "./model";

/**
 * "Average player" AI, also used by the simulation script:
 * rerolls its weakest Pokémon (same type) while it is weak, picks the best option,
 * then keeps the 3 Pokémon with the best stats + move-type coverage, strongest first.
 */
export function playDraftAsBot(
  dex: Dex,
  pool: Species[],
  dayKey: string,
  day: string,
  playerId: string,
  cfg = { draft: DRAFT, bots: BOTS },
): DraftState {
  const bst = (speciesId: number) => dex.speciesById.get(speciesId)!.bst;
  let state = startDraft(pool, dayKey, day, playerId, cfg.draft);

  const tried = new Set<number>();
  while (state.rerollsLeft >= cfg.draft.rerollCost.sameType) {
    const candidates = state.roster.map((r, i) => ({ i, bst: bst(r.speciesId) })).filter((c) => !tried.has(c.i));
    const weakest = candidates.sort((a, b) => a.bst - b.bst)[0];
    if (!weakest || weakest.bst >= cfg.bots.rerollBelowBst) break;
    tried.add(weakest.i);
    try {
      state = startReroll(state, pool, weakest.i, "sameType", cfg.draft);
    } catch {
      continue;
    }
    const options = state.pending!.options;
    const best = options.reduce((bi, o, i) => (bst(o.speciesId) > bst(options[bi].speciesId) ? i : bi), 0);
    state = chooseRerollOption(state, best);
  }

  const teamScore = (indices: number[]) => {
    const species = indices.map((i) => dex.speciesById.get(state.roster[i].speciesId)!);
    const moveTypes = new Set(species.flatMap((s) => s.moves.map((id) => dex.movesById.get(id)!.type)));
    return species.reduce((sum, s) => sum + s.bst, 0) + 15 * moveTypes.size;
  };
  let bestTeam: number[] = [];
  let bestScore = -Infinity;
  const n = state.roster.length;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++) {
        const score = teamScore([a, b, c]);
        if (score > bestScore) {
          bestScore = score;
          bestTeam = [a, b, c];
        }
      }
  bestTeam.sort((x, y) => bst(state.roster[y].speciesId) - bst(state.roster[x].speciesId));
  return lockTeam(setTeam(state, bestTeam.slice(0, cfg.draft.teamSize), cfg.draft), cfg.draft);
}

export const botName = (index: number) => `Bot Trainer #${String(index + 1).padStart(2, "0")}`;
