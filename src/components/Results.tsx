"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { dex } from "@/data/dex";
import { battleScore, simulateBattle, summarizeBattle, type BattleTeam, type Standing } from "@/engine";
import { battleTimeline, faintedAt, scoreAt, type BattleTimeline } from "@/lib/liveScore";
import { DialogBox } from "./DialogBox";
import { Sprite } from "./Sprite";

/** Live ticker pace: one battle turn every TURN_MS, a short pause between matches. */
const TURN_MS = 160;
const BETWEEN_MS = 350;

interface Match {
  opponent: Standing;
  team: [BattleTeam, BattleTeam];
  timeline: BattleTimeline;
  keyMoment: string;
}

/**
 * After lock: the 10 battles play one after another like a live football score app,
 * then the score and the (local, phase 1) leaderboard.
 */
export function Results({
  me,
  ranking,
  alreadyWatched,
  onWatched,
}: {
  me: Standing;
  ranking: Standing[];
  alreadyWatched: boolean;
  onWatched: () => void;
}) {
  const matches = useMemo<Match[]>(() => {
    const byId = new Map(ranking.map((s) => [s.entrant.id, s]));
    return me.battles.map((b) => {
      const opponent = byId.get(b.opponentId)!;
      const team: [BattleTeam, BattleTeam] = [me.entrant.team, opponent.entrant.team];
      const result = simulateBattle(team[0], team[1], b.seed, dex);
      return { opponent, team, timeline: battleTimeline(result.events), keyMoment: summarizeBattle(result.events, team, dex).text };
    });
  }, [me, ranking]);

  // Playback position: the match being played and its current turn.
  const [live, setLive] = useState(() => (alreadyWatched ? { index: matches.length, turn: 0 } : { index: 0, turn: 0 }));
  const finished = live.index >= matches.length;

  useEffect(() => {
    if (finished) {
      onWatched();
      return;
    }
    const match = matches[live.index];
    const t =
      live.turn < match.timeline.turns
        ? setTimeout(() => setLive({ index: live.index, turn: live.turn + 1 }), TURN_MS)
        : setTimeout(() => setLive({ index: live.index + 1, turn: 0 }), BETWEEN_MS);
    return () => clearTimeout(t);
  }, [live, finished, matches, onWatched]);

  const doneCount = Math.min(live.index, matches.length);
  const doneBattles = me.battles.slice(0, doneCount);
  const wins = doneBattles.filter((b) => b.won).length;
  const rank = ranking.findIndex((s) => s.entrant.id === me.entrant.id) + 1;

  const message = !finished
    ? `Your team is battling ${matches.length} trainers…`
    : rank === 1
      ? "You are the Trainer of the Day! Nobody did better today."
      : rank <= 3
        ? `Amazing! You are #${rank} of ${ranking.length} today.`
        : `You finished #${rank} of ${ranking.length} with ${me.wins} wins. Come back tomorrow for a new draft!`;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <DialogBox key={String(finished)} text={message} />

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["RANK", finished ? `#${rank}` : "…"],
          ["RECORD", `${wins}-${doneCount - wins}`],
          ["SCORE", battleScore(doneBattles).toFixed(1)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border-[3px] border-[#383848] bg-bg-deep py-2">
            <p className="font-pixel text-[8px] text-white/60">{label}</p>
            <p className="font-pixel mt-1.5 text-sm text-accent">{value}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-pixel text-[10px] text-white/80">YOUR {matches.length} BATTLES</h2>
          {!finished && (
            <button type="button" onClick={() => setLive({ index: matches.length, turn: 0 })} className="font-pixel text-[8px] text-[#6890f0]">
              SKIP ▶▶
            </button>
          )}
        </div>
        <ul className="flex flex-col gap-1.5">
          {matches.map((m, i) => (
            <MatchRow
              key={m.opponent.entrant.id}
              match={m}
              state={i < live.index ? "done" : i === live.index ? "live" : "upcoming"}
              turn={i < live.index ? m.timeline.turns : i === live.index ? live.turn : 0}
            />
          ))}
        </ul>
        {finished && <p className="mt-1.5 text-center text-[10px] text-white/40">Tap a battle to see how it went.</p>}
      </section>

      {finished && <Ranking me={me} ranking={ranking} />}
    </div>
  );
}

function MatchRow({ match, state, turn }: { match: Match; state: "upcoming" | "live" | "done"; turn: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (state === "live") ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [state]);
  const { timeline, team, opponent } = match;
  const [mine, theirs] = scoreAt(timeline, turn);
  const fainted = faintedAt(timeline, turn);
  const won = timeline.winner === 0;
  const border =
    state === "done" ? (won ? "border-[#2a9a3a]" : "border-[#d03020]") : state === "live" ? "border-accent" : "border-transparent";
  const nameOf = (side: 0 | 1, slot: number) => dex.speciesById.get(team[side].members[slot].speciesId)!.name;

  return (
    <li ref={ref} className="scroll-mb-4">
      <button
        type="button"
        disabled={state !== "done"}
        onClick={() => setOpen((o) => !o)}
        className={`w-full rounded-lg border-[3px] bg-panel px-2 py-1.5 text-left text-ink ${border} ${state === "upcoming" ? "opacity-60" : ""}`}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
          <TeamSide name="You" team={team[0]} fainted={fainted[0]} />
          <div className="flex flex-col items-center px-1">
            <span className="font-pixel text-base tabular-nums">
              {state === "upcoming" ? "–" : `${mine}-${theirs}`}
            </span>
            <span className="mt-1 text-[10px] font-semibold">
              {state === "live" && (
                <span className="flex items-center gap-1 text-[#d03020]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#d03020]" />
                  T{turn}
                </span>
              )}
              {state === "done" && <span className={won ? "text-[#2a9a3a]" : "text-[#d03020]"}>{won ? "WIN" : "LOSS"}</span>}
              {state === "upcoming" && <span className="text-ink/50">next</span>}
            </span>
          </div>
          <TeamSide name={opponent.entrant.name} team={team[1]} fainted={fainted[1]} right />
        </div>

        {open && state === "done" && (
          <div className="mt-2 border-t border-black/10 pt-2 text-xs">
            <ul className="space-y-0.5">
              {timeline.knockOuts.map((k, i) => (
                <li key={i} className="flex gap-2">
                  <span className="w-7 shrink-0 tabular-nums text-ink/50">T{k.turn}</span>
                  <span className={k.side === 1 ? "text-[#2a7a3a]" : "text-[#b03020]"}>
                    {k.by ? `${nameOf(k.by.side, k.by.slot)} knocked out ${nameOf(k.side, k.slot)}` : `${nameOf(k.side, k.slot)} fainted`}
                  </span>
                </li>
              ))}
              {timeline.reason === "timeout" && <li className="text-ink/60">Time limit: decided on remaining HP.</li>}
            </ul>
            <p className="mt-1.5 font-semibold">{match.keyMoment}</p>
          </div>
        )}
      </button>
    </li>
  );
}

function TeamSide({ name, team, fainted, right = false }: { name: string; team: BattleTeam; fainted: Set<number>; right?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-col ${right ? "items-end" : "items-start"}`}>
      <span className="w-full truncate text-[11px] font-semibold" style={{ textAlign: right ? "right" : "left" }}>
        {name}
      </span>
      <span className={`flex ${right ? "flex-row-reverse" : ""}`}>
        {team.members.map((m, slot) => (
          <span
            key={slot}
            className={`-my-1 h-10 w-10 overflow-hidden transition duration-300 ${fainted.has(slot) ? "opacity-30 grayscale" : ""}`}
            title={dex.speciesById.get(m.speciesId)!.name}
          >
            <Sprite speciesId={m.speciesId} shiny={m.shiny} flip={!right} className="origin-top-left scale-[0.42]" />
          </span>
        ))}
      </span>
    </div>
  );
}

function Ranking({ me, ranking }: { me: Standing; ranking: Standing[] }) {
  const [hideBots, setHideBots] = useState(false);
  return (
    <section className="anim-fade-up">
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
  );
}
