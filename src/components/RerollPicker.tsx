"use client";

import { useState } from "react";
import { dex } from "@/data/dex";
import type { RosterSlot } from "@/engine";
import { MoveList } from "./MoveList";
import { Sprite } from "./Sprite";
import { StatBars } from "./StatBars";
import { TypeBadge } from "./TypeBadge";

/** After a reroll: the player must pick one of the options (the old Pokémon is gone). */
export function RerollPicker({ replaced, options, onPick }: { replaced: RosterSlot; options: RosterSlot[]; onPick: (i: number) => void }) {
  const [open, setOpen] = useState(0);
  const old = dex.speciesById.get(replaced.speciesId)!;
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60">
      <div className="dialog-box anim-fade-up max-h-[94vh] w-full max-w-md overflow-y-auto rounded-b-none px-4 pb-5 pt-3">
        <p className="font-pixel text-[10px] leading-relaxed">Pick a Pokémon to replace {old.name}</p>
        <p className="mb-3 text-[11px] text-ink/60">You must choose one: the reroll is final.</p>
        <div className="flex flex-col gap-2">
          {options.map((o, i) => {
            const s = dex.speciesById.get(o.speciesId)!;
            const expanded = open === i;
            return (
              <div key={o.speciesId} className={`rounded-lg border-[3px] ${expanded ? "border-accent" : "border-[#383848]"} bg-white/60`}>
                <button type="button" className="flex w-full items-center gap-2 px-2 py-1 text-left" onClick={() => setOpen(i)}>
                  <Sprite speciesId={s.id} shiny={o.shiny} scale={1} alt={s.name} className="shrink-0 -my-2 scale-75" />
                  <div className="min-w-0 flex-1">
                    <p className="font-pixel text-[9px]">
                      {o.shiny && "✨ "}
                      {s.name}
                    </p>
                    <div className="mt-1 flex items-center gap-1">
                      {s.types.map((t) => (
                        <TypeBadge key={t} type={t} small />
                      ))}
                      <span className="ml-1 text-[10px] text-ink/60">BST {s.bst}</span>
                    </div>
                  </div>
                  <span className="text-xs text-ink/40">{expanded ? "▲" : "▼"}</span>
                </button>
                {expanded && (
                  <div className="px-2 pb-2">
                    <StatBars stats={s.baseStats} />
                    <div className="mt-2">
                      <MoveList species={s} />
                    </div>
                    <button type="button" onClick={() => onPick(i)} className="pixel-button mt-2 w-full bg-accent py-2.5 text-[10px] text-ink">
                      Take {s.name}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
