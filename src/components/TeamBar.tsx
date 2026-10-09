"use client";

import { DRAFT } from "@/config/game";
import { dex } from "@/data/dex";
import type { RosterSlot } from "@/engine";
import { Sprite } from "./Sprite";

/** Sticky bar with the 3 chosen Pokémon in entry order, reordering and the lock button. */
export function TeamBar({
  roster,
  team,
  onMoveUp,
  onLock,
}: {
  roster: RosterSlot[];
  team: number[];
  onMoveUp: (position: number) => void;
  onLock: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center">
      <div className="w-full max-w-md border-t-4 border-[#383848] bg-bg-deep px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
        <p className="font-pixel mb-1 text-[8px] text-white/60">YOUR TEAM · ENTRY ORDER (TAP ◀ TO MOVE UP)</p>
        <div className="flex items-center gap-2">
          {Array.from({ length: DRAFT.teamSize }, (_, pos) => {
            const idx = team[pos];
            const slot = idx !== undefined ? roster[idx] : null;
            const s = slot ? dex.speciesById.get(slot.speciesId)! : null;
            return (
              <div key={pos} className="flex h-14 flex-1 items-center gap-1 rounded-md border-2 border-dashed border-white/25 px-1">
                <span className="font-pixel text-[9px] text-accent">{pos + 1}</span>
                {slot && s ? (
                  <>
                    <div className="-my-4 h-12 w-12 shrink-0 overflow-hidden">
                      <Sprite speciesId={s.id} shiny={slot.shiny} className="origin-top-left scale-50" />
                    </div>
                    {pos > 0 && (
                      <button type="button" onClick={() => onMoveUp(pos)} className="ml-auto px-1 text-xs text-white/70" aria-label={`Move ${s.name} up`}>
                        ◀
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-[10px] text-white/30">empty</span>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={onLock}
            disabled={team.length !== DRAFT.teamSize}
            className="pixel-button h-14 bg-[#e3350d] px-3 text-[9px] text-white"
          >
            LOCK
          </button>
        </div>
      </div>
    </div>
  );
}
