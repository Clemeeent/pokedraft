# PROGRESS — PokéDraft

## Phase en cours
**Phase 0 — Cadrage.** Plan d'architecture proposé, en attente des réponses aux questions bloquantes.

## Fait
- Dépôt initialisé, `CLAUDE.md` (règles du projet) et `PROGRESS.md` créés.

## Reste à faire (phase 1 — prototype local)
1. Squelette Next.js + TypeScript + Tailwind + Vitest, commande unique `npm run dev` / `npm test`.
2. Script `scripts/fetch-pokemon.ts` : PokéAPI → `data/pokemon.json` + `data/moves.json`
   (stats, types, génération, légendaire/fabuleux, 4 attaques retenues).
3. Script `scripts/fetch-sprites.ts` : téléchargement des sprites dans `public/sprites/`, rapport de couverture.
4. `src/engine/` : RNG à seed, tirage du roster, rerolls, moteur de combat + tests.
5. Écrans : tirage (animation Pokéball), rerolls, sélection des 3, combats contre bots, replay texte + barres de PV.
6. Script de simulation (diversité, force des Pokémon) — première version.

## Décisions prises (et pourquoi)
| Décision | Pourquoi |
|---|---|
| Un seul projet Next.js, le moteur dans `src/engine/` sans aucune dépendance | Plus simple à maintenir qu'un « monorepo » ; le dossier moteur reste réutilisable tel quel côté serveur. |
| Combats côté serveur via les routes Next.js (Vercel) plutôt que les Edge Functions Supabase | Un seul langage/outil de déploiement ; les Edge Functions tournent sous Deno, ce qui ajoute une 2ᵉ chaîne de build. |
| Minuit Paris géré par pg_cron (Supabase) qui tourne toutes les heures et fige les journées terminées | Vercel Cron gratuit n'est précis qu'à ±1 h et ne connaît que l'heure UTC (problème avec l'heure d'été). |
| RNG maison à seed (hash de chaîne + générateur sfc32) | Déterministe, identique navigateur/serveur, zéro dépendance. |
| Données Pokémon en JSON statique versionné dans le repo | Rapide, fonctionne même si PokéAPI est en panne. |

## Questions ouvertes
Voir le dernier message de cadrage (pool / formes, source des sprites, fournisseurs de connexion, ordinateur utilisé).
