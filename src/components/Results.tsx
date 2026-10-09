"use client";

import { useState } from "react";
import { dex } from "@/data/dex";
import type { BattleTeam, Standing } from "@/engine";
import { DialogBox } from "./DialogBox";
import { Replay } from "./Replay";
import { Sprite } from "./Sprite";

/** After lock: the 10 battles, the score and the (local, phase 1) leaderboard. */
export function Results({ me, ranking }: { me: Standing; ranking: Standing[] }) {
  const [replay, setReplay] = useState<{ seed: string; teams: [BattleTeam, BattleTeam] } | null>(null);
  const [hideBots, setHideBots] = useState(false);
  const byId = new Map(ranking.map((s) => [s.entrant.id, s]));
  const rank = ranking.findIndex((s) => s.entrant.id === me.entrant.id) + 1;
  const losses = me.battles.length - me.wins;

  const message =
    rank === 1
      ? "You are the Trainer of the Day! Nobody did better today."
      : rank <= 3
        ? `Amazing! You are #${rank} of ${ranking.length} today.`
        : `You finished #${rank} of ${ranking.length} with ${me.wins} wins. Come back tomorrow for a new draft!`;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <DialogBox text={message} />

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["RANK", `#${rank}`],
          ["RECORD", `${me.wins}-${losses}`],
          ["SCORE", me.score.toFixed(1)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border-[3px] border-[#383848] bg-bg-deep py-2">
            <p className="font-pixel text-[8px] text-white/60">{label}</p>
            <p className="font-pixel mt-1.5 text-sm text-accent">{value}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="font-pixel mb-2 text-[10px] text-white/80">YOUR 10 BATTLES</h2>
        <ul className="flex flex-col gap-1.5">
          {me.battles.map((b, i) => {
            const opp = byId.get(b.opponentId)!;
            return (
              <li key={b.opponentId}>
                <button
                  type="button"
                  onClick={() => setReplay({ seed: b.seed, teams: [me.entrant.team, opp.entrant.team] })}
                  className="flex w-full items-center gap-2 rounded-lg bg-panel px-2 py-1 text-left text-ink"
                >
                  <span className={`font-pixel w-6 text-center text-[10px] ${b.won ? "text-[#2a9a3a]" : "text-[#d03020]"}`}>
                    {b.won ? "W" : "L"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">
                      {i + 1}. {opp.entrant.name}
                    </span>
                    <span className="text-[10px] text-ink/60">their record {opp.wins}-{opp.battles.length - opp.wins}</span>
                  </span>
                  <span className="flex">
                    {opp.entrant.team.members.map((m) => (
                      <span key={m.speciesId} className="-my-3 h-12 w-12 overflow-hidden">
                        <Sprite speciesId={m.speciesId} shiny={m.shiny} className="origin-top-left scale-50" />
                      </span>
                    ))}
                  </span>
                  <span className="font-pixel text-[8px] text-[#6890f0]">▶</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-pixel text-[10px] text-white/80">TODAY&apos;S RANKING</h2>
          <label className="flex items-center gap-1.5 text-xs text-white/70">
            <input type="checkbox" checked={hideBots} onChange={(e) => setHideBots(e.target.checked)} />
            Hide bots
          </label>
        </div>
        <ol className="flex flex-col gap-1">
          {ranking.map((s, i) => {
            if (hideBots && s.entrant.isBot) return null;
            const isMe = s.entrant.id === me.entrant.id;
            return (
              <li
                key={s.entrant.id}
                className={`flex items-center gap-2 rounded-md px-2 py-1 text-xs ${isMe ? "bg-accent font-semibold text-ink" : "bg-white/5"}`}
              >
                <span className="font-pixel w-7 text-[9px]">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">
                  {s.entrant.name}
                  {s.entrant.isBot && <span className="ml-1 text-[10px] opacity-60">🤖</span>}
                </span>
                <span className="flex">
                  {s.entrant.team.members.map((m) => (
                    <span key={m.speciesId} className="-my-2 h-8 w-8 overflow-hidden" title={dex.speciesById.get(m.speciesId)!.name}>
                      <Sprite speciesId={m.speciesId} shiny={m.shiny} className="origin-top-left scale-[0.33]" />
                    </span>
                  ))}
                </span>
                <span className="w-10 text-right tabular-nums">{s.wins}W</span>
                <span className="w-10 text-right tabular-nums">{s.score.toFixed(1)}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {replay && <Replay teams={replay.teams} seed={replay.seed} onClose={() => setReplay(null)} />}
    </div>
  );
}
