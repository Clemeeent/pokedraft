"use client";

import { useEffect, useMemo, useState } from "react";
import { dex } from "@/data/dex";
import { simulateBattle, summarizeBattle, type BattleTeam, type Side } from "@/engine";
import { buildReplay, type ReplayFrame } from "@/lib/replay";
import { DialogBox } from "./DialogBox";
import { HpBar } from "./HpBar";
import { Sprite } from "./Sprite";

const SPEEDS = [1, 2, 4] as const;
const BASE_DELAY = 1100;

/** Accelerated replay: recomputes the battle from its seed (same seed = same battle). */
export function Replay({ teams, seed, onClose }: { teams: [BattleTeam, BattleTeam]; seed: string; onClose: () => void }) {
  const { frames, summary } = useMemo(() => {
    const result = simulateBattle(teams[0], teams[1], seed, dex);
    return { frames: buildReplay(result.events, teams, dex), summary: summarizeBattle(result.events, teams, dex) };
  }, [teams, seed]);
  const [index, setIndex] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(2);
  const done = index >= frames.length - 1;

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setIndex((i) => i + 1), BASE_DELAY / speed);
    return () => clearTimeout(t);
  }, [index, speed, done]);

  const frame = frames[Math.min(index, frames.length - 1)];

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-bg-deep">
      <div className="flex h-full w-full max-w-md flex-col px-3 pb-4 pt-3">
        <div className="flex items-center justify-between">
          <p className="font-pixel text-[9px] text-white/70">
            vs {teams[1].name} · Turn {frame.turn}
          </p>
          <button type="button" onClick={onClose} className="font-pixel px-2 py-1 text-xs text-white/70" aria-label="Close replay">
            ✕
          </button>
        </div>

        <div className="relative mt-2 h-[min(380px,52vh)] shrink-0 overflow-hidden rounded-lg border-4 border-[#383848] bg-gradient-to-b from-[#a8d8f0] via-[#d8f0c0] to-[#88c070]">
          <Fighter frame={frame} side={1} teams={teams} />
          <Fighter frame={frame} side={0} teams={teams} />
        </div>

        <DialogBox key={index} text={done ? summary.text || frame.message : frame.message} className="mt-3" instant={speed === 4} />

        <div className="flex-1" />
        <div className="mt-3 flex items-center gap-2">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={`pixel-button flex-1 py-2 text-[9px] ${speed === s ? "bg-accent text-ink" : "bg-[#d0d0d8] text-ink"}`}
            >
              x{s}
            </button>
          ))}
          {done ? (
            <button type="button" onClick={() => setIndex(0)} className="pixel-button flex-[1.4] bg-[#6890f0] py-2 text-[9px] text-white">
              REPLAY
            </button>
          ) : (
            <button type="button" onClick={() => setIndex(frames.length - 1)} className="pixel-button flex-[1.4] bg-[#e3350d] py-2 text-[9px] text-white">
              SKIP ▶▶
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Fighter({ frame, side, teams }: { frame: ReplayFrame; side: Side; teams: [BattleTeam, BattleTeam] }) {
  const slot = frame.active[side];
  const member = teams[side].members[slot];
  const view = frame.teams[side][slot];
  const species = dex.speciesById.get(member.speciesId)!;
  const hit = frame.effect.side === side && frame.effect.kind !== "none";
  const mine = side === 0;
  return (
    <div className={`absolute flex w-full items-end gap-2 px-3 ${mine ? "bottom-3 flex-row" : "top-3 flex-row-reverse"}`}>
      <div className="relative shrink-0">
        <div className={`absolute bottom-1 left-1/2 h-4 w-28 -translate-x-1/2 rounded-[50%] bg-black/15`} />
        <div
          key={`${slot}-${view.fainted}-${frame.message}`}
          className={view.fainted ? "anim-faint" : hit ? "anim-hit" : ""}
        >
          <Sprite speciesId={member.speciesId} shiny={member.shiny} scale={mine ? 2 : 1} flip={mine} alt={species.name} />
        </div>
      </div>
      <div className="dialog-box mb-2 min-w-0 flex-1 px-2.5 py-1.5">
        <div className="flex items-center justify-between gap-1">
          <p className="font-pixel truncate text-[8px]">
            {member.shiny && "✨"}
            {species.name}
          </p>
          <div className="flex gap-0.5">
            {frame.teams[side].map((f) => (
              <span key={f.slot} className={`h-2 w-2 rounded-full border border-[#383848] ${f.fainted ? "bg-[#888]" : "bg-[#e3350d]"}`} />
            ))}
          </div>
        </div>
        {view.status && (
          <span className="font-pixel mt-0.5 inline-block rounded-sm bg-[#c05030] px-1 text-[6px] uppercase text-white">
            {view.status === "paralysis" ? "PAR" : view.status === "burn" ? "BRN" : "PSN"}
          </span>
        )}
        <HpBar hp={view.hp} maxHp={view.maxHp} energy={frame.energy[side]} />
      </div>
    </div>
  );
}
