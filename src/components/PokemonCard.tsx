import { dex } from "@/data/dex";
import type { RosterSlot } from "@/engine";
import { Sprite } from "./Sprite";
import { TypeBadge } from "./TypeBadge";

/** Roster tile: sprite, name, types, BST and the team position if selected. */
export function PokemonCard({
  slot,
  teamPosition,
  onClick,
  dimmed = false,
}: {
  slot: RosterSlot;
  teamPosition: number | null;
  onClick?: () => void;
  dimmed?: boolean;
}) {
  const s = dex.speciesById.get(slot.speciesId)!;
  const selected = teamPosition !== null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center rounded-lg border-[3px] px-1 pb-2 pt-1 text-ink transition ${
        selected ? "border-accent bg-[#fff6d8]" : "border-[#383848] bg-panel"
      } ${dimmed ? "opacity-60" : ""}`}
    >
      {selected && (
        <span className="font-pixel absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[9px] text-ink">
          {teamPosition + 1}
        </span>
      )}
      {slot.shiny && <span className="absolute right-1.5 top-1 text-sm text-[#d89a00]">✨</span>}
      <Sprite speciesId={s.id} shiny={slot.shiny} scale={1} alt={s.name} />
      <p className="font-pixel mt-1 w-full truncate text-center text-[8px] leading-tight">{s.name}</p>
      <div className="mt-1 flex flex-wrap justify-center gap-0.5">
        {s.types.map((t) => (
          <TypeBadge key={t} type={t} small />
        ))}
      </div>
      <p className="mt-1 text-[10px] text-ink/60">BST {s.bst}</p>
    </button>
  );
}
