"use client";

import { useCallback, useMemo, useState } from "react";
import { DRAFT } from "@/config/game";
import { dayPool, dex } from "@/data/dex";
import {
  chooseRerollOption,
  daySeed,
  DraftError,
  lockTeam,
  playLockedTeam,
  rankStandings,
  setTeam,
  simulateBotDay,
  startDraft,
  startReroll,
  toBattleTeam,
  type DraftState,
  type RerollConstraint,
} from "@/engine";
import { currentDayKey, PHASE1_THEME } from "@/lib/day";
import { clearDay, getPlayerId, loadDay, loadSettings, saveDay, saveSettings, type SavedDay } from "@/lib/storage";
import { DialogBox } from "./DialogBox";
import { PokeBall } from "./PokeBall";
import { PokemonCard } from "./PokemonCard";
import { PokemonSheet } from "./PokemonSheet";
import { RerollPicker } from "./RerollPicker";
import { Results } from "./Results";
import { Reveal } from "./Reveal";
import { TeamBar } from "./TeamBar";

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function GameApp() {
  const [dayKey] = useState(currentDayKey);
  const [playerId] = useState(getPlayerId);
  const day = daySeed(dayKey, PHASE1_THEME);
  const [saved, setSaved] = useState<SavedDay | null>(() => loadDay(dayKey));
  const [settings, setSettings] = useState(loadSettings);
  const [sheet, setSheet] = useState<number | null>(null);
  const [revealingReroll, setRevealingReroll] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const instant = settings.fastAnimations || prefersReducedMotion();

  const persist = useCallback(
    (next: SavedDay) => {
      setSaved(next);
      saveDay(dayKey, next);
    },
    [dayKey],
  );
  const updateDraft = (fn: (d: DraftState) => DraftState) => {
    if (!saved) return;
    try {
      persist({ ...saved, draft: fn(saved.draft) });
      setError(null);
    } catch (e) {
      setError(e instanceof DraftError ? e.message : "Something went wrong");
    }
  };

  const draft = saved?.draft ?? null;

  const results = useMemo(() => {
    if (!draft?.locked) return null;
    const field = simulateBotDay(dex, dayPool, dayKey, day);
    const me = playLockedTeam(dex, day, { id: playerId, name: "You", isBot: false, team: toBattleTeam("You", draft) }, field);
    return { me, ranking: rankStandings([...field, me]) };
  }, [draft, dayKey, day, playerId]);

  const onRosterRevealed = useCallback(() => {
    setSaved((s) => {
      if (!s || s.revealed) return s;
      const next = { ...s, revealed: true };
      saveDay(dayKey, next);
      return next;
    });
  }, [dayKey]);
  const onRerollRevealed = useCallback(() => setRevealingReroll(false), []);

  const begin = () => persist({ draft: startDraft(dayPool, dayKey, day, playerId), revealed: false });

  const toggleTeam = (index: number) =>
    updateDraft((d) => setTeam(d, d.team.includes(index) ? d.team.filter((i) => i !== index) : [...d.team, index]));

  const reroll = (slot: number, constraint: RerollConstraint) => {
    setSheet(null);
    updateDraft((d) => startReroll(d, dayPool, slot, constraint));
    setRevealingReroll(true);
  };

  const moveUp = (pos: number) =>
    updateDraft((d) => {
      const team = [...d.team];
      [team[pos - 1], team[pos]] = [team[pos], team[pos - 1]];
      return setTeam(d, team);
    });

  const toggleFast = () => {
    const next = { ...settings, fastAnimations: !settings.fastAnimations };
    setSettings(next);
    saveSettings(next);
  };

  return (
    <div data-fast={instant} className="mx-auto flex w-full max-w-md flex-1 flex-col px-4">
      <header className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <PokeBall tier="poke" size={28} />
          <div>
            <h1 className="font-pixel text-sm text-accent">PokéDraft</h1>
            <p className="text-[11px] text-white/60">Daily draft · {dayKey}</p>
          </div>
        </div>
        {draft && !draft.locked && (
          <div className="text-right">
            <p className="font-pixel text-[8px] text-white/60">REROLLS</p>
            <p className="mt-1 text-sm">{"🎲".repeat(draft.rerollsLeft) || "—"}</p>
          </div>
        )}
      </header>

      <main className="flex-1">
        {!draft && <Intro onStart={begin} />}

        {draft && !draft.locked && (
          <div className="flex flex-col gap-3">
            <DialogBox
              key={draft.team.length}
              text={
                draft.team.length < DRAFT.teamSize
                  ? `Tap a Pokémon to see its moves. Pick ${DRAFT.teamSize - draft.team.length} more for your team, or reroll the weak ones.`
                  : "Team ready! Set the entry order (the first one opens the battle), then lock it."
              }
              instant={instant}
            />
            {error && <p className="rounded bg-[#d03020] px-3 py-2 text-xs">{error}</p>}
            <div className="grid grid-cols-3 gap-2">
              {draft.roster.map((slot, i) => (
                <PokemonCard
                  key={`${i}-${slot.speciesId}`}
                  slot={slot}
                  teamPosition={draft.team.includes(i) ? draft.team.indexOf(i) : null}
                  onClick={() => setSheet(i)}
                />
              ))}
            </div>
            <TeamBar roster={draft.roster} team={draft.team} onMoveUp={moveUp} onLock={() => setConfirmLock(true)} />
          </div>
        )}

        {draft?.locked && results && <Results me={results.me} ranking={results.ranking} />}
      </main>

      <footer className={`pt-8 ${draft && !draft.locked ? "pb-32" : "pb-6"} text-center text-[10px] leading-relaxed text-white/40`}>
        <label className="mb-2 flex items-center justify-center gap-2 text-white/60">
          <input type="checkbox" checked={settings.fastAnimations} onChange={toggleFast} /> Fast animations
        </label>
        PokéDraft is a non-commercial fan project. Pokémon and Pokémon character names are trademarks of Nintendo, Game Freak
        and The Pokémon Company. Sprites: Pokémon Showdown / Smogon, PokéAPI.
        <br />
        <button
          type="button"
          className="mt-2 underline"
          onClick={() => {
            clearDay(dayKey);
            setSaved(null);
            setSheet(null);
          }}
        >
          Reset today (prototype only)
        </button>
      </footer>

      {saved && !saved.revealed && (
        <Reveal items={saved.draft.roster} onDone={onRosterRevealed} instant={instant} speed={1.4} title="TODAY'S ROSTER" />
      )}

      {draft?.pending && revealingReroll && (
        <Reveal items={draft.pending.options} onDone={onRerollRevealed} instant={instant} speed={1.2} title="REROLL" />
      )}
      {draft?.pending && !revealingReroll && (
        <RerollPicker
          replaced={draft.roster[draft.pending.slot]}
          options={draft.pending.options}
          onPick={(i) => updateDraft((d) => chooseRerollOption(d, i))}
        />
      )}

      {draft && sheet !== null && !draft.locked && (
        <PokemonSheet
          slot={draft.roster[sheet]}
          teamPosition={draft.team.includes(sheet) ? draft.team.indexOf(sheet) : null}
          teamFull={draft.team.length >= DRAFT.teamSize}
          rerollsLeft={draft.rerollsLeft}
          onToggleTeam={() => {
            toggleTeam(sheet);
            setSheet(null);
          }}
          onReroll={(c) => reroll(sheet, c)}
          onClose={() => setSheet(null)}
        />
      )}

      {confirmLock && draft && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-6" onClick={() => setConfirmLock(false)}>
          <div className="dialog-box w-full max-w-sm p-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm">Lock your team? It will battle 10 trainers right away and can&apos;t be changed today.</p>
            <div className="mt-4 flex gap-2">
              <button type="button" className="pixel-button flex-1 bg-[#d0d0d8] py-2.5 text-[9px] text-ink" onClick={() => setConfirmLock(false)}>
                NOT YET
              </button>
              <button
                type="button"
                className="pixel-button flex-1 bg-[#e3350d] py-2.5 text-[9px] text-white"
                onClick={() => {
                  setConfirmLock(false);
                  updateDraft((d) => lockTeam(d));
                  window.scrollTo({ top: 0 });
                }}
              >
                LOCK & BATTLE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 pt-6 text-center">
      <div className="flex gap-3">
        <PokeBall tier="poke" size={48} />
        <PokeBall tier="great" size={48} />
        <PokeBall tier="ultra" size={48} />
        <PokeBall tier="master" size={48} />
      </div>
      <DialogBox className="w-full" text="Welcome, Trainer! Today you get 6 random Pokémon. Reroll the weak ones, keep your best 3 and battle the other trainers of the day." />
      <ul className="w-full space-y-1 text-left text-xs text-white/70">
        <li>🎲 {DRAFT.rerollsPerDay} rerolls: same type, same generation, or free (costs 2).</li>
        <li>⚔️ Pick 3 and their order, lock, then 10 automatic battles.</li>
        <li>🏆 Best score of the day = Trainer of the Day.</li>
      </ul>
      <button type="button" onClick={onStart} className="pixel-button w-full bg-[#e3350d] py-4 text-xs text-white">
        DRAW MY 6 POKÉMON
      </button>
    </div>
  );
}
