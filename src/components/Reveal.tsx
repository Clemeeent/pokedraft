"use client";

import { useEffect, useState } from "react";
import { dex } from "@/data/dex";
import { ballTier, type RosterSlot } from "@/engine";
import { PokeBall } from "./PokeBall";
import { Sprite } from "./Sprite";
import { TypeBadge } from "./TypeBadge";

const SHAKES = { poke: 1, great: 2, ultra: 3, master: 3 } as const;
const TIMING = { drop: 300, shake: 380, shakePause: 140, openEach: 220, hold: 700 };

type Stage = { kind: "drop" } | { kind: "shake"; round: number } | { kind: "open"; opened: number } | { kind: "done" };

/**
 * All balls appear at once and shake together: rarer balls (better color) keep shaking for
 * more rounds. Then they burst open one after another. Tap to open everything immediately.
 */
export function Reveal({ items, onDone, instant, title }: { items: RosterSlot[]; onDone: () => void; instant: boolean; title: string }) {
  const [stage, setStage] = useState<Stage>({ kind: "drop" });
  const tiers = items.map((it) => ballTier(dex.speciesById.get(it.speciesId)!));
  const maxShakes = Math.max(...tiers.map((t) => SHAKES[t]));

  useEffect(() => {
    if (instant) {
      const t = setTimeout(onDone, 0);
      return () => clearTimeout(t);
    }
    let delay: number;
    let next: () => void;
    switch (stage.kind) {
      case "drop":
        delay = TIMING.drop;
        next = () => setStage({ kind: "shake", round: 1 });
        break;
      case "shake":
        delay = TIMING.shake + TIMING.shakePause;
        next = () => setStage(stage.round < maxShakes ? { kind: "shake", round: stage.round + 1 } : { kind: "open", opened: 1 });
        break;
      case "open":
        delay = stage.opened < items.length ? TIMING.openEach : TIMING.hold;
        next = () => setStage(stage.opened < items.length ? { kind: "open", opened: stage.opened + 1 } : { kind: "done" });
        break;
      case "done":
        delay = 0;
        next = onDone;
        break;
    }
    const t = setTimeout(next, delay);
    return () => clearTimeout(t);
  }, [stage, instant, onDone, maxShakes, items.length]);

  if (instant) return null;

  const skip = () => {
    if (stage.kind === "open" && stage.opened >= items.length) onDone();
    else setStage({ kind: "open", opened: items.length });
  };

  return (
    <button
      type="button"
      onClick={skip}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-bg-deep px-4 text-center"
      aria-label="Tap to open all"
    >
      <p className="font-pixel mb-8 text-[10px] text-white/70">{title}</p>
      <div className="grid w-full max-w-sm grid-cols-3 gap-x-2 gap-y-5">
        {items.map((item, i) => {
          const species = dex.speciesById.get(item.speciesId)!;
          const tier = tiers[i];
          const opened = stage.kind === "open" && i < stage.opened;
          const justOpened = stage.kind === "open" && i === stage.opened - 1;
          const shaking = stage.kind === "shake" && stage.round <= SHAKES[tier];
          return (
            <div key={i} className="relative flex h-40 flex-col items-center justify-end">
              {!opened ? (
                <div
                  key={stage.kind === "shake" ? `shake-${stage.round}` : stage.kind}
                  className={`mb-10 ${stage.kind === "drop" ? "anim-ball-drop" : shaking ? "anim-ball-shake" : ""} ${
                    item.shiny && stage.kind === "shake" ? "anim-ball-glint" : ""
                  }`}
                  style={stage.kind === "drop" ? { animationDelay: `${i * 30}ms` } : undefined}
                >
                  <PokeBall tier={tier} size={56} />
                </div>
              ) : (
                <>
                  <div className="anim-pop-in relative">
                    <Sprite speciesId={species.id} shiny={item.shiny} scale={1} alt={species.name} />
                    {item.shiny && <Sparkles />}
                  </div>
                  <p className="font-pixel mt-1 w-full truncate text-[8px]">
                    {item.shiny && <span className="text-accent">✨</span>}
                    {species.name}
                  </p>
                  <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                    {species.types.map((t) => (
                      <TypeBadge key={t} type={t} small />
                    ))}
                  </div>
                </>
              )}
              {justOpened && <div className="anim-flash pointer-events-none absolute bottom-6 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-white" />}
            </div>
          );
        })}
      </div>
      <p className="absolute bottom-6 text-[11px] text-white/40">Tap to open all</p>
    </button>
  );
}

function Sparkles() {
  const spots = [
    [5, 10],
    [80, 15],
    [15, 70],
    [85, 65],
  ];
  return (
    <>
      {spots.map(([x, y], i) => (
        <span
          key={i}
          className="anim-sparkle pointer-events-none absolute text-sm text-accent"
          style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 160}ms` }}
        >
          ✦
        </span>
      ))}
    </>
  );
}
