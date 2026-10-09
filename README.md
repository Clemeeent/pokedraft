# PokéDraft

Daily Pokémon draft game: draw 6 random Pokémon, reroll, keep 3, battle the other trainers of the day.

## Run it on a Mac

1. Install **Node.js LTS** (free) from https://nodejs.org → download the macOS installer and run it.
2. Open the **Terminal** app and run:

```bash
git clone https://github.com/Clemeeent/pokedraft.git
cd pokedraft
git checkout claude/laughing-lovelace-v70r9i
./start.sh
```

3. Open http://localhost:3000 in your browser.

`./start.sh` installs everything, runs the tests, downloads the sprites (first time only, ~1 min) and
starts the game. Stop it with `Ctrl+C`. Next times, `./start.sh` is all you need.

## Useful commands

| Command | What it does |
|---|---|
| `npm test` | Runs the engine tests (battle, draw, rerolls…) |
| `npm run dev` | Starts the game locally |
| `npm run simulate` | Balancing simulation (2000 bot players) — `-- --players=5000` for more |
| `npm run data:fetch` then `npm run data:build` | Re-downloads Pokémon data from PokéAPI and rebuilds movesets |
| `npm run sprites` | Downloads missing sprites into `public/sprites/` |

Prototype tips: `http://localhost:3000/?day=2026-12-25` plays another day; "Reset today" in the footer
lets you replay the current day.

## Credits

Non-commercial fan project. Pokémon and Pokémon character names are trademarks of Nintendo, Game Freak and
The Pokémon Company. Data: PokéAPI. Sprites: Pokémon Showdown / Smogon sprite project, PokéAPI.
