import { BOTS } from "../config/game";
import { simulateBattle, type BattleTeam } from "./battle";
import { botName, playDraftAsBot } from "./bots";
import { teamMembers, type DraftState } from "./draft";
import type { Dex, Species } from "./model";
import { createRng, seedOf } from "./rng";
import { battleScore } from "./scoring";

export interface Entrant {
  id: string;
  name: string;
  isBot: boolean;
  team: BattleTeam;
}

export interface BattleRecord {
  opponentId: string;
  seed: string;
  won: boolean;
  opponentWinRate: number;
}

export interface Standing {
  entrant: Entrant;
  battles: BattleRecord[];
  wins: number;
  score: number;
}

export const toBattleTeam = (name: string, draft: DraftState): BattleTeam => ({ name, members: teamMembers(draft) });

export const battleSeed = (day: string, a: string, b: string) => seedOf(day, "battle", a, b);

/**
 * Phase 1 local day: the day's bots (same AI as an average player) each play `battlesPerTeam`
 * battles against other bots, which gives every bot a win rate (its strength).
 */
export function simulateBotDay(dex: Dex, pool: Species[], dayKey: string, day: string, cfg = BOTS): Standing[] {
  const bots: Entrant[] = Array.from({ length: cfg.botsPerDay }, (_, i) => {
    const id = `bot-${i}`;
    const name = botName(i);
    return { id, name, isBot: true, team: toBattleTeam(name, playDraftAsBot(dex, pool, dayKey, day, id)) };
  });
  const opponentsOf = (i: number) =>
    Array.from({ length: Math.min(cfg.battlesPerTeam, bots.length - 1) }, (_, k) => bots[(i + k + 1) % bots.length]);

  const raw = bots.map((bot, i) =>
    opponentsOf(i).map((opp) => {
      const seed = battleSeed(day, bot.id, opp.id);
      return { opponentId: opp.id, seed, won: simulateBattle(bot.team, opp.team, seed, dex).winner === 0 };
    }),
  );
  const winRate = new Map(bots.map((b, i) => [b.id, raw[i].filter((r) => r.won).length / raw[i].length]));
  return bots.map((entrant, i) => {
    const battles = raw[i].map((r) => ({ ...r, opponentWinRate: winRate.get(r.opponentId)! }));
    return { entrant, battles, wins: battles.filter((b) => b.won).length, score: battleScore(battles) };
  });
}

/** Plays the locked team against `battlesPerTeam` opponents picked (seeded) among the day's teams. */
export function playLockedTeam(dex: Dex, day: string, player: Entrant, field: Standing[], cfg = BOTS): Standing {
  const rng = createRng(seedOf(day, "matchmaking", player.id));
  const pool = [...field];
  const opponents: Standing[] = [];
  while (opponents.length < cfg.battlesPerTeam && pool.length > 0) {
    opponents.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  }
  const battles = opponents.map((opp) => {
    const seed = battleSeed(day, player.id, opp.entrant.id);
    const won = simulateBattle(player.team, opp.entrant.team, seed, dex).winner === 0;
    return { opponentId: opp.entrant.id, seed, won, opponentWinRate: opp.wins / Math.max(1, opp.battles.length) };
  });
  return { entrant: player, battles, wins: battles.filter((b) => b.won).length, score: battleScore(battles) };
}

export function rankStandings(standings: Standing[]): Standing[] {
  return [...standings].sort((a, b) => b.score - a.score || b.wins - a.wins || a.entrant.id.localeCompare(b.entrant.id));
}
