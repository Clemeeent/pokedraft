"use client";

import { useEffect, useState } from "react";

/** Game-style dialog box whose text types itself letter by letter. */
export function DialogBox({ text, instant = false, className = "" }: { text: string; instant?: boolean; className?: string }) {
  const [shown, setShown] = useState({ text, count: instant ? text.length : 0 });
  const count = shown.text === text ? shown.count : 0;

  useEffect(() => {
    if (instant || count >= text.length) return;
    const t = setTimeout(() => setShown({ text, count: count + 2 }), 18);
    return () => clearTimeout(t);
  }, [count, text, instant]);

  return (
    <div className={`dialog-box px-4 py-3 text-sm leading-relaxed ${className}`}>
      <p className="min-h-[2.8em]">{instant ? text : text.slice(0, count)}</p>
    </div>
  );
}
