export function HpBar({ hp, maxHp, energy }: { hp: number; maxHp: number; energy?: number }) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const color = pct > 50 ? "var(--hp-high)" : pct > 20 ? "var(--hp-mid)" : "var(--hp-low)";
  return (
    <div className="w-full">
      <div className="flex items-center gap-1">
        <span className="font-pixel text-[7px] text-[#f8a800]">HP</span>
        <div className="h-2.5 flex-1 rounded-sm border-2 border-[#383848] bg-[#506058]">
          <div className="h-full transition-[width] duration-300" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
      <div className="mt-0.5 flex items-center justify-between text-[10px] tabular-nums text-ink/70">
        <span>{energy !== undefined ? `⚡${energy}` : ""}</span>
        <span>
          {hp}/{maxHp}
        </span>
      </div>
    </div>
  );
}
