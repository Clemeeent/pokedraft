import { SCORING } from "../config/game";

export interface ScoredBattle {
  won: boolean;
  /** Opponent's win rate in its own battles (0–1): stronger opponents give more points. */
  opponentWinRate: number;
}

export function opponentFactor(winRate: number, cfg = SCORING): number {
  const rate = Math.max(0, Math.min(1, winRate));
  return cfg.minOpponentFactor + (cfg.maxOpponentFactor - cfg.minOpponentFactor) * rate;
}

/** Score = sum over wins of points × opponent strength factor (rounded to 0.1). */
export function battleScore(battles: ScoredBattle[], cfg = SCORING): number {
  const raw = battles.reduce((sum, b) => sum + (b.won ? cfg.pointsPerWin * opponentFactor(b.opponentWinRate, cfg) : 0), 0);
  return Math.round(raw * 10) / 10;
}
