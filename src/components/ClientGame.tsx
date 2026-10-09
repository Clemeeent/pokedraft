"use client";

import dynamic from "next/dynamic";

/** The game reads localStorage, so it only renders in the browser (no server pre-render). */
const GameApp = dynamic(() => import("./GameApp"), {
  ssr: false,
  loading: () => <p className="font-pixel mt-20 text-center text-[10px] text-white/60">Loading…</p>,
});

export function ClientGame() {
  return <GameApp />;
}
