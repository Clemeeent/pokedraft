import type { BattleEvent, BattleTeam, Side } from "./battle";
import type { Dex } from "./model";

export interface KeyMoment {
  text: string;
  /** Pokémon of the winning side that did the most work. */
  mvp: { side: Side; slot: number; kos: number } | null;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Explains the battle's key moment, from the point of view of side 0 ("your" team). */
export function summarizeBattle(events: BattleEvent[], teams: [BattleTeam, BattleTeam], dex: Dex): KeyMoment {
  const end = events.find((e) => e.kind === "end");
  if (!end || end.kind !== "end") return { text: "", mvp: null };
  const winner = end.winner;
  const whose = (side: Side) => (side === 0 ? "Your" : "Their");
  const speciesOf = (side: Side, slot: number) => dex.speciesById.get(teams[side].members[slot].speciesId)!;

  const kos = new Map<string, { side: Side; slot: number; kos: number; superKo?: { moveType: string; targetSlot: number } }>();
  let lastMove: { side: Side; slot: number; moveId: number } | null = null;
  let lastHit: { effectiveness: number; side: Side; slot: number } | null = null;
  for (const e of events) {
    if (e.kind === "move") lastMove = e;
    if (e.kind === "damage") lastHit = e;
    if (e.kind === "faint" && lastMove && lastMove.side !== e.side && lastHit?.side === e.side) {
      const key = `${lastMove.side}-${lastMove.slot}`;
      const entry = kos.get(key) ?? { side: lastMove.side, slot: lastMove.slot, kos: 0 };
      entry.kos++;
      if (lastHit.effectiveness >= 2 && !entry.superKo) {
        entry.superKo = { moveType: dex.movesById.get(lastMove.moveId)?.type ?? "normal", targetSlot: e.slot };
      }
      kos.set(key, entry);
    }
  }

  const winners = [...kos.values()].filter((k) => k.side === winner).sort((a, b) => b.kos - a.kos || Number(!!b.superKo) - Number(!!a.superKo));
  const mvp = winners[0] ?? null;
  if (end.reason === "timeout") {
    return { text: `A long battle! ${whose(winner)} team won on remaining HP.`, mvp };
  }
  if (!mvp) return { text: `${whose(winner)} team outlasted the opponent.`, mvp: null };

  const name = speciesOf(mvp.side, mvp.slot).name;
  if (mvp.superKo) {
    const loser: Side = winner === 0 ? 1 : 0;
    const target = speciesOf(loser, mvp.superKo.targetSlot);
    const verb = mvp.kos >= 2 ? "turned the match" : "made the difference";
    return {
      text: `${whose(winner)} ${name} ${verb} thanks to its ${cap(mvp.superKo.moveType)} advantage against ${target.types.map(cap).join("/")}.`,
      mvp,
    };
  }
  if (mvp.kos >= 2) return { text: `${whose(winner)} ${name} swept ${mvp.kos} Pokémon on its own!`, mvp };
  return { text: `${whose(winner)} ${name} landed the decisive blow.`, mvp };
}
