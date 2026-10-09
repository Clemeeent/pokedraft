"use client";

import { useEffect, useState } from "react";
import { dex } from "@/data/dex";
import { ballTier, type RosterSlot } from "@/engine";
import { PokeBall } from "./PokeBall";
import { Sprite } from "./Sprite";
import { TypeBadge } from "./TypeBadge";

type Phase = "drop" | "shake" | "pause" | "glint" | "flash" | "shown";

const SHAKES = { poke: 1, great: 2, ultra: 3, master: 3 } as const;

/**
 * Ball reveal: the ball drops, shakes 1–3 times (more = rarer), opens in a white flash,
 * and the Pokémon pops out. Tap to skip ahead. `speed` > 1 makes it faster (roster chain).
 */
export function Reveal({
  items,
  onDone,
  instant,
  speed = 1,
  title,
}: {
  items: RosterSlot[];
  onDone: () => void;
  instant: boolean;
  speed?: number;
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("drop");
  const [shakesDone, setShakesDone] = useState(0);

  const current = items[index];
  const species = current ? dex.speciesById.get(current.speciesId)! : null;
  const tier = species ? ballTier(species) : "poke";

  useEffect(() => {
    if (instant || index >= items.length) {
      const t = setTimeout(onDone, instant ? 0 : 150);
      return () => clearTimeout(t);
    }
    const ms = (n: number) => n / speed;
    let next: () => void;
    let delay: number;
    switch (phase) {
      case "drop":
        delay = ms(300);
        next = () => setPhase("shake");
        break;
      case "shake":
        delay = ms(420);
        next = () => {
          setShakesDone((n) => n + 1);
          setPhase("pause");
        };
        break;
      case "pause":
        delay = ms(220);
        next = () => setPhase(shakesDone < SHAKES[tier] ? "shake" : current.shiny ? "glint" : "flash");
        break;
      case "glint":
        delay = ms(900);
        next = () => setPhase("flash");
        break;
      case "flash":
        delay = ms(160);
        next = () => setPhase("shown");
        break;
      case "shown":
        delay = ms(index === items.length - 1 ? 900 : 650);
        next = () => {
          setIndex((i) => i + 1);
          setShakesDone(0);
          setPhase("drop");
        };
        break;
    }
    const t = setTimeout(next, delay);
    return () => clearTimeout(t);
  }, [phase, index, shakesDone, instant, items.length, onDone, speed, tier, current]);

  const skip = () => {
    if (phase !== "shown") setPhase("shown");
    else {
      setIndex((i) => i + 1);
      setShakesDone(0);
      setPhase("drop");
    }
  };

  if (instant || !current || !species) return null;
  const shown = phase === "shown";

  return (
    <button
      type="button"
      onClick={skip}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-bg-deep text-center"
      aria-label="Tap to skip"
    >
      <p className="font-pixel absolute top-8 text-[10px] text-white/70">{title}</p>
      <div className="relative flex h-52 w-52 items-end justify-center">
        {!shown && (
          <div
            key={`${index}-${phase}-${shakesDone}`}
            className={
              phase === "drop" ? "anim-ball-drop" : phase === "shake" ? "anim-ball-shake" : phase === "glint" ? "anim-ball-glint" : ""
            }
          >
            <PokeBall tier={tier} size={80} />
          </div>
        )}
        {shown && (
          <div key={`mon-${index}`} className="anim-pop-in relative">
            <Sprite speciesId={species.id} shiny={current.shiny} scale={2} alt={species.name} />
            {current.shiny && <Sparkles />}
          </div>
        )}
        {phase === "flash" && <div className="anim-flash pointer-events-none fixed inset-0 bg-white" />}
      </div>
      <div className={`mt-4 flex h-16 flex-col items-center gap-2 ${shown ? "anim-fade-up" : "opacity-0"}`}>
        <p className="font-pixel text-sm">
          {current.shiny && <span className="text-accent">✨ </span>}
          {species.name}
        </p>
        <div className="flex gap-1">
          {species.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </div>
      </div>
      <div className="absolute bottom-10 flex gap-2">
        {items.map((it, i) => (
          <span key={i} className={`h-2 w-2 rounded-full ${i < index || (i === index && shown) ? "bg-accent" : "bg-white/25"}`} />
        ))}
      </div>
      <p className="absolute bottom-4 text-[11px] text-white/40">Tap to speed up</p>
    </button>
  );
}

function Sparkles() {
  const spots = [
    [8, 10],
    [80, 18],
    [20, 70],
    [88, 64],
    [50, 0],
  ];
  return (
    <>
      {spots.map(([x, y], i) => (
        <span
          key={i}
          className="anim-sparkle pointer-events-none absolute text-lg text-accent"
          style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 160}ms` }}
        >
          ✦
        </span>
      ))}
    </>
  );
}
