"use client";

import { DRAFT } from "@/config/game";
import { dex } from "@/data/dex";
import type { RerollConstraint, RosterSlot } from "@/engine";
import { MoveList } from "./MoveList";
import { Sprite } from "./Sprite";
import { StatBars } from "./StatBars";
import { TypeBadge } from "./TypeBadge";

const CONSTRAINT_LABELS: Record<RerollConstraint, { label: string; hint: string }> = {
  sameType: { label: "Same type", hint: "shares a type" },
  sameGeneration: { label: "Same gen", hint: "same generation" },
  free: { label: "Free", hint: "anything" },
};

/** Bottom sheet with the Pokémon's details and actions (add to team, reroll). */
export function PokemonSheet({
  slot,
  teamPosition,
  teamFull,
  rerollsLeft,
  onToggleTeam,
  onReroll,
  onClose,
}: {
  slot: RosterSlot;
  teamPosition: number | null;
  teamFull: boolean;
  rerollsLeft: number;
  onToggleTeam: () => void;
  onReroll: (c: RerollConstraint) => void;
  onClose: () => void;
}) {
  const s = dex.speciesById.get(slot.speciesId)!;
  const inTeam = teamPosition !== null;
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="dialog-box anim-fade-up max-h-[92vh] w-full max-w-md overflow-y-auto rounded-b-none px-4 pb-5 pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <Sprite speciesId={s.id} shiny={slot.shiny} scale={1} alt={s.name} className="shrink-0" />
          <div className="min-w-0 flex-1 pt-2">
            <p className="font-pixel text-[11px] leading-snug">
              {slot.shiny && "✨ "}
              {s.name}
            </p>
            <p className="mt-1 text-[11px] text-ink/60">
              #{s.id} · Gen {s.generation} · BST {s.bst}
              {(s.isLegendary || s.isMythical) && " · Legendary"}
            </p>
            <div className="mt-1.5 flex gap-1">
              {s.types.map((t) => (
                <TypeBadge key={t} type={t} />
              ))}
            </div>
          </div>
          <button type="button" onClick={onClose} className="font-pixel px-2 text-xs text-ink/60" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="mt-3">
          <StatBars stats={s.baseStats} />
        </div>
        <p className="font-pixel mb-1.5 mt-4 text-[9px] text-ink/70">MOVES</p>
        <MoveList species={s} />
        <p className="mt-1 text-[10px] text-ink/50">⚡ energy cost — every Pokémon gains 20 energy per turn.</p>

        <button
          type="button"
          onClick={onToggleTeam}
          disabled={!inTeam && teamFull}
          className={`pixel-button mt-4 w-full py-3 text-[10px] ${inTeam ? "bg-[#d0d0d8] text-ink" : "bg-accent text-ink"}`}
        >
          {inTeam ? "Remove from team" : teamFull ? "Team is full (3/3)" : "Add to team"}
        </button>

        <p className="font-pixel mb-1.5 mt-5 text-[9px] text-ink/70">
          REROLL · {rerollsLeft} left · 3 options, no going back
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(CONSTRAINT_LABELS) as RerollConstraint[]).map((c) => {
            const cost = DRAFT.rerollCost[c];
            return (
              <button
                key={c}
                type="button"
                disabled={rerollsLeft < cost}
                onClick={() => onReroll(c)}
                className="pixel-button flex flex-col items-center gap-1 bg-[#6890f0] px-1 py-2 text-[8px] text-white"
              >
                <span>{CONSTRAINT_LABELS[c].label}</span>
                <span className="font-sans text-[10px] opacity-80">
                  {CONSTRAINT_LABELS[c].hint} · {cost} 🎲
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
