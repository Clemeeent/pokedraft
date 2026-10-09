import { dex } from "@/data/dex";
import { energyCost, type Species } from "@/engine";
import { TypeBadge } from "./TypeBadge";

export function MoveList({ species }: { species: Species }) {
  if (species.moves.length === 0) {
    return <p className="text-xs text-ink/70">No attacking move: this Pokémon can only Struggle.</p>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {species.moves.map((id) => {
        const m = dex.movesById.get(id)!;
        const cost = energyCost(m);
        const stab = species.types.includes(m.type);
        return (
          <li key={id} className="flex items-center gap-2 rounded bg-black/5 px-2 py-1.5 text-xs">
            <TypeBadge type={m.type} small />
            <span className="flex-1 font-semibold">
              {m.name}
              {stab && <span className="ml-1 text-[10px] font-normal text-ink/50">STAB</span>}
            </span>
            <span className="w-8 text-right text-[10px] text-ink/60">{m.category === "physical" ? "PHY" : "SPE"}</span>
            <span className="w-9 text-right tabular-nums">{m.minHits > 1 ? `${m.power}×${m.minHits === m.maxHits ? m.minHits : `${m.minHits}-${m.maxHits}`}` : m.power}</span>
            <span className={`w-9 text-right tabular-nums ${cost === 0 ? "text-[#2a9a3a]" : "text-[#c07000]"}`} title="Energy cost">
              ⚡{cost}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
