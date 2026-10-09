import type { BaseStats } from "@/engine";

const LABELS: [keyof BaseStats, string][] = [
  ["hp", "HP"],
  ["atk", "Atk"],
  ["def", "Def"],
  ["spa", "SpA"],
  ["spd", "SpD"],
  ["spe", "Spe"],
];

export function StatBars({ stats }: { stats: BaseStats }) {
  return (
    <div className="grid grid-cols-[28px_28px_1fr] items-center gap-x-2 gap-y-0.5 text-[11px]">
      {LABELS.map(([key, label]) => {
        const v = stats[key];
        const color = v >= 110 ? "#2a9a3a" : v >= 80 ? "#7ab830" : v >= 55 ? "#e0a020" : "#e05030";
        return (
          <div key={key} className="contents">
            <span className="text-ink/60">{label}</span>
            <span className="text-right tabular-nums">{v}</span>
            <div className="h-2 rounded-sm bg-black/10">
              <div className="h-2 rounded-sm" style={{ width: `${Math.min(100, (v / 180) * 100)}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
