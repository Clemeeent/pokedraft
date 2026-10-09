# PokéDraft — project rules for Claude Code

Read `PROGRESS.md` first at the start of every session, before touching code.
The owner is a designer, not a developer: explain technical choices simply, give exact
commands, and say how to test at the end of each step. Ask before any irreversible or
online action (prod DB migration, data deletion, deploy).

## The game (summary)
Daily Pokémon draft. Each day (Europe/Paris) has a global seed (date + theme) that fixes
the rules and the pool. Each player's draw derives from day seed + user id: different for
everyone, reproducible server-side, one roster per player per day.

1. **Roster**: 6 random Pokémon from the day's pool. No duplicates, max 1 legendary/mythical,
   legendaries less likely. Shiny chance (cosmetic only, configurable, ~1/500).
2. **Rerolls**: 3 per day (configurable). Replace one roster slot with a constraint:
   same type (shares ≥1 type), same generation, or free (whole pool, costs 2). Each reroll
   offers 3 options, player picks one. Irreversible.
3. **Team**: pick 3 of 6 + entry order, then lock. Locked = final.
4. **Battles**: on lock, exactly 10 battles (configurable) vs 10 already-locked teams of the
   day (snapshots); fill with day-seeded bots of average skill. Replays available.
5. **Score**: wins weighted by opponent strength, adjusted by a rarity bonus (pick rate of
   each Pokémon among final teams, recomputed live, frozen at midnight). Live leaderboard.
   Midnight Paris: freeze, "Trainer of the Day" medal to #1 real registered player
   (never a bot, never a guest).
- **Bots**: configurable count, auto mode keeps ≥30 teams total, can be disabled,
  identifiable names, filterable.
- **Diversity**: pool ≥ ~150 (auto-widen restrictive themes); simulation script measures top-50
  diversity, strongest-Pokémon win rate, badge progression pace.

## Battle engine
- Real base stats at level 50, full type chart, STAB, 4 real moves per Pokémon chosen
  deterministically (best STAB + coverage), energy instead of PP (energy per turn, cost ∝ power).
- 3v3, speed order, KO → next, simple deterministic AI (best available move; switch if matchup
  very bad). Light RNG (accuracy, crits, damage variance) from the battle seed.
- Outputs a full event log for replays. Same seed = same battle.
- **Pure TypeScript module in `src/engine/`: no imports from Next.js, React, Supabase, or the
  DOM.** Runs in browser (phase 1) and on server (phase 2) unchanged.
- All balancing values live in `src/config/` — never hard-code them.
- Tests define expected behaviour. If a test seems wrong, explain why to the owner instead of
  changing/deleting it to make it pass.

## Stack
- Next.js (App Router) + TypeScript (strict) + Tailwind. Vitest for tests.
- Phase 2+: Supabase (Postgres, Auth anonymous + linking, Realtime), Vercel hosting.
- Pokémon data fetched once from PokéAPI (GitHub mirror `PokeAPI/api-data`) by `scripts/fetch-pokemon.ts`
  into `data/source/`, then `scripts/build-data.ts` picks movesets → `data/pokemon.json`, `data/moves.json`.
  Game never calls PokéAPI at runtime. Pool: 1025 base species (no Mega / regional forms).
- Sprites: Pokémon Showdown "gen5" style (smogon/sprites repo), downloaded by `scripts/fetch-sprites.ts` into
  `public/sprites/` (gitignored, runs before dev/build), PokéAPI fallback. Self-hosted, no hotlinking.
- Phase 2 auth: magic link only. Owner uses a Mac.
- Next.js 16 has breaking changes: read `node_modules/next/dist/docs/` before using a Next API (see AGENTS.md).
- Commands: `./start.sh` (install + test + dev), `npm test`, `npm run simulate`.
- Anything that affects ranking (draw, rerolls, selection, battles) is validated server-side
  from phase 2 on.

## Conventions
- UI in English; code, identifiers and comments in English.
- Mobile-first. A game session takes 2–5 minutes.
- Pixel-art retro look: "Press Start 2P" for titles/names, readable font for body,
  `image-rendering: pixelated`, integer scaling only. Respect `prefers-reduced-motion`.
- Pure functions in the engine; strict typing; no speculative abstractions — build only what the
  current phase needs.
- Secrets in `.env*` (never committed).
- Commit after every working step with a clear message.
- Before saying a step is done: run tests and check the screen in a browser, including mobile width.
- Fan project, non-commercial: keep the Nintendo / Game Freak / The Pokémon Company notice in the footer.
