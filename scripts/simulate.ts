/**
 * Balancing simulation: thousands of "players" (basic bot AI) draft and lock a team, each team
 * plays its battles against teams locked before it, then we measure:
 *  - diversity of the top 50 (distinct teams, most frequent Pokémon),
 *  - whether the strongest Pokémon win every time (win rate by base-stat-total bracket).
 *
 *   npm run simulate                 (2000 players, today)
 *   npm run simulate -- --players=5000 --day=2026-10-09
 */
import movesJson from "../data/moves.json";
import pokemonJson from "../data/pokemon.json";
import { BOTS } from "../src/config/game";
import {
  battleScore,
  createDex,
  daySeed,
  isLegendary,
  playDraftAsBot,
  simulateBattle,
  teamMembers,
  type BattleTeam,
  type Move,
  type Species,
} from "../src/engine";
import { battleSeed } from "../src/engine/day";

const arg = (name: string, fallback: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const players = Number(arg("players", "2000"));
const dayKey = arg("day", new Date().toISOString().slice(0, 10));

const dex = createDex(pokemonJson as Species[], movesJson as Move[]);
const pool = dex.species;
const day = daySeed(dayKey, "all");
const name = (id: number) => dex.speciesById.get(id)!.name;

console.log(`Simulating ${players} players on ${dayKey} (${BOTS.battlesPerTeam} battles each)…`);
const started = Date.now();

const teams: { id: string; team: BattleTeam }[] = [];
for (let i = 0; i < players; i++) {
  const id = `sim-${i}`;
  teams.push({ id, team: { name: id, members: teamMembers(playDraftAsBot(dex, pool, dayKey, day, id)) } });
}

// Each team plays the teams locked right before it (the first ones wrap around to the end,
// standing in for the day's bots).
const results = teams.map(() => [] as { opponent: number; won: boolean }[]);
const speciesStats = new Map<number, { battles: number; wins: number }>();
let totalTurns = 0;
let battles = 0;
teams.forEach((t, i) => {
  for (let k = 1; k <= BOTS.battlesPerTeam; k++) {
    const j = (i - k + players) % players;
    const r = simulateBattle(t.team, teams[j].team, battleSeed(day, t.id, teams[j].id), dex);
    results[i].push({ opponent: j, won: r.winner === 0 });
    totalTurns += r.turns;
    battles++;
    for (const [side, team] of [[0, t.team], [1, teams[j].team]] as const) {
      for (const m of team.members) {
        const s = speciesStats.get(m.speciesId) ?? { battles: 0, wins: 0 };
        s.battles++;
        if (r.winner === side) s.wins++;
        speciesStats.set(m.speciesId, s);
      }
    }
  }
});

const winRate = results.map((r) => r.filter((b) => b.won).length / r.length);
const scored = teams
  .map((t, i) => ({
    ...t,
    wins: results[i].filter((b) => b.won).length,
    score: battleScore(results[i].map((b) => ({ won: b.won, opponentWinRate: winRate[b.opponent] }))),
  }))
  .sort((a, b) => b.score - a.score);

const top = scored.slice(0, 50);
const teamKey = (t: BattleTeam) => t.members.map((m) => m.speciesId).sort((a, b) => a - b).join("-");
const freq = new Map<number, number>();
for (const t of top) for (const m of t.team.members) freq.set(m.speciesId, (freq.get(m.speciesId) ?? 0) + 1);
const legendsInTop = top.reduce((n, t) => n + t.team.members.filter((m) => isLegendary(dex.speciesById.get(m.speciesId)!)).length, 0);

console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(1)}s — ${battles} battles, ${(totalTurns / battles).toFixed(1)} turns on average.`);
console.log(`\n== Top 50 diversity ==`);
console.log(`Distinct teams: ${new Set(top.map((t) => teamKey(t.team))).size}/50`);
console.log(`Legendaries in top-50 teams: ${legendsInTop}/150 slots`);
console.log(
  "Most frequent Pokémon:",
  [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, n]) => `${name(id)} ×${n}`).join(", "),
);
console.log(`Best score: ${top[0].score} (${top[0].wins} wins) — ${top[0].team.members.map((m) => name(m.speciesId)).join(", ")}`);

console.log(`\n== Win rate by base stat total (does raw power always win?) ==`);
const brackets = [0, 400, 450, 500, 550, 600, 2000];
for (let b = 0; b < brackets.length - 1; b++) {
  let wins = 0;
  let total = 0;
  for (const [id, s] of speciesStats) {
    const bst = dex.speciesById.get(id)!.bst;
    if (bst >= brackets[b] && bst < brackets[b + 1]) {
      wins += s.wins;
      total += s.battles;
    }
  }
  const label = b === brackets.length - 2 ? `${brackets[b]}+` : `${brackets[b]}–${brackets[b + 1] - 1}`;
  console.log(`BST ${label.padEnd(8)} ${total ? ((100 * wins) / total).toFixed(1).padStart(5) : "  -  "}%  (${total} appearances)`);
}

const ranked = [...speciesStats.entries()].filter(([, s]) => s.battles >= 40).map(([id, s]) => ({ id, rate: s.wins / s.battles, n: s.battles }));
ranked.sort((a, b) => b.rate - a.rate);
console.log(`\nBest win rates (≥40 battles): ${ranked.slice(0, 8).map((r) => `${name(r.id)} ${(100 * r.rate).toFixed(0)}%`).join(", ")}`);
console.log(`Worst win rates (≥40 battles): ${ranked.slice(-8).map((r) => `${name(r.id)} ${(100 * r.rate).toFixed(0)}%`).join(", ")}`);
