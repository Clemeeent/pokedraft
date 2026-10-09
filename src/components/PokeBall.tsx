import { useMemo } from "react";
import type { BallTier } from "@/engine";

const SIZE = 16;
const PALETTES: Record<BallTier, { top: string; shade: string; accent?: string }> = {
  poke: { top: "#e3350d", shade: "#a8240a" },
  great: { top: "#3b6fd8", shade: "#244a9e", accent: "#e3350d" },
  ultra: { top: "#2b2b2b", shade: "#151515", accent: "#f2c230" },
  master: { top: "#7a3fb0", shade: "#552b7c", accent: "#f06bb0" },
};

/** Pixel-art ball drawn on a 16×16 grid (crisp at any integer scale). */
export function PokeBall({ tier, size = 64, className = "" }: { tier: BallTier; size?: number; className?: string }) {
  const pixels = useMemo(() => {
    const p = PALETTES[tier];
    const out: { x: number; y: number; c: string }[] = [];
    const c = (SIZE - 1) / 2;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const d = Math.hypot(x - c, y - c);
        if (d > 7.6) continue;
        const db = Math.hypot(x - c, y - c - 0.0);
        let color: string;
        if (d > 6.6) color = "#101010";
        else if (db < 1.6) color = "#ffffff";
        else if (db < 2.7) color = "#101010";
        else if (y === 7 || y === 8) color = "#101010";
        else if (y < 7) {
          const accentZone = p.accent && y >= 2 && y <= 4 && (x <= 4 || x >= 11);
          color = accentZone ? p.accent! : x > 10 || y < 2 ? p.shade : p.top;
          if (tier === "master" && y === 4 && x >= 6 && x <= 9) color = "#ffffff";
        } else color = x > 10 || y > 13 ? "#c8c8c8" : "#f4f4f4";
        if (y < 7 && x === 4 && y === 3 && !p.accent) color = "#ffffff"; // shine
        out.push({ x, y, c: color });
      }
    }
    return out;
  }, [tier]);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={`pixelated ${className}`}
      aria-hidden
    >
      {pixels.map((px) => (
        <rect key={`${px.x}-${px.y}`} x={px.x} y={px.y} width={1} height={1} fill={px.c} />
      ))}
    </svg>
  );
}
