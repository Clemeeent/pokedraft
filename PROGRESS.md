# PROGRESS — PokéDraft

## Phase en cours
**Phase 1 — Prototype local : terminée, en attente de validation.**

## Fait
### Phase 0
- `CLAUDE.md`, `PROGRESS.md`, plan d'architecture validé.

### Phase 1
- Squelette Next.js 16 + TypeScript strict + Tailwind 4 + Vitest. `./start.sh` = install + tests + lancement.
- Données : `scripts/fetch-pokemon.ts` (PokéAPI → `data/source/`), `scripts/build-data.ts`
  (choix des 4 attaques → `data/pokemon.json`, `data/moves.json`). 1025 Pokémon, gén. 1 à 9.
- Sprites : `scripts/fetch-sprites.ts` télécharge les sprites Showdown « gen5 » (animés gén. 1-5, fixes au même style
  après) dans `public/sprites/` (non commité, 62 Mo, téléchargé automatiquement avant `dev`/`build`).
  Couverture 1025/1025 : 9 Pokémon absents chez Showdown utilisent le sprite PokéAPI.
- Moteur (`src/engine/`, pur, sans dépendance) : RNG à seed, table des types, stats niv. 50, formule de dégâts réelle,
  STAB, énergie, IA de combat, switch, brûlure/paralysie/poison, changements de stats, recul/drain, multi-coups,
  log d'événements, résumé du moment clé, tirage du roster, rerolls (3 options, définitifs), sélection, verrouillage,
  bots, score.
- 43 tests unitaires (`npm test`).
- Script de simulation `npm run simulate` (diversité du top 50, taux de victoire par puissance).
- Écrans : accueil, révélation Pokéball (toutes les Balls ensemble, 1–3 secousses selon la rareté, ouverture en
  cascade, ~3–4 s pour 6), roster, fiche Pokémon (stats + 4 attaques + coût d'énergie), reroll, choix des 3 + ordre,
  verrouillage, 10 combats joués en direct un par un dans une liste façon « live score » (score = KO, Pokémon KO
  grisés, tour en cours), détail de chaque combat au toucher (chronologie des KO + moment clé), classement local.
- Retours propriétaire après la 1re version : replay visuel plein écran supprimé (remplacé par le live score inline),
  animation de tirage raccourcie.
- Réglage « animations rapides » + respect de `prefers-reduced-motion`. Mention légale en pied de page.

## Reste à faire
- Phase 2 : Supabase (invités, comptes magic link, persistance), combats côté serveur, classement temps réel,
  cron de minuit, mise en ligne Vercel.
- Équilibrage à affiner avec la simulation (légendaires : 28/150 places du top 50 le 09/10).

## Décisions prises (et pourquoi)
| Décision | Pourquoi |
|---|---|
| Un seul projet Next.js, moteur dans `src/engine/` sans dépendance | Simple à maintenir, réutilisable tel quel côté serveur en phase 2. |
| Combats serveur via les routes Next.js (Vercel), pas les Edge Functions Supabase | Un seul outil de déploiement (les Edge Functions tournent sous Deno). |
| Minuit Paris via pg_cron (Supabase) toutes les heures | Vercel Cron gratuit n'est précis qu'à ±1 h et ignore l'heure d'été. |
| RNG maison (cyrb128 + sfc32) | Déterministe, identique navigateur/serveur, zéro dépendance. |
| Pool : 1025 espèces de base, sans Méga ni formes régionales | Validé par le propriétaire. |
| Sprites Showdown « gen5 » | Choix du propriétaire (style uniforme pour toutes les générations). |
| Données via le miroir GitHub de PokéAPI (`PokeAPI/api-data`) | Mêmes données que l'API, sans limite d'appels. |
| Attaques : tout ce qui est apprenable dans la dernière génération principale (jeux dérivés exclus) | « Jeu le plus récent » ; Legends Z-A / Arceus / Champions ont des listes partielles. |
| 4 attaques = meilleur STAB de chaque type + couverture (hors Normal) + une attaque gratuite + meilleure restante | Profil clair et toujours une attaque utilisable au tour 1. Attaques à charge/recharge/auto-KO exclues (liste dans la config). |
| Énergie : +20/tour, attaques ≤ 40 de puissance gratuites, puis 0,5 énergie par point au-delà | Petites attaques immédiates, grosses attaques tous les 2–3 tours. |
| IA : achève si possible au moindre coût, sinon meilleure attaque si payable, sinon attaque la moins chère | Crée le rythme « petite, petite, grosse » sans prévision complexe. |
| Score : 3 pts par victoire × (0,8 → 1,2 selon le taux de victoire de l'adversaire) | « Pondéré par la force de l'adversaire », validé. Bonus de rareté en phase 2/3. |
| Pokémon sans attaque offensive (Métapod, Ditto…) utilisent Lutte | Comme dans les vrais jeux ; ce sont des choix à laisser sur le banc. |
| Connexion phase 2 : magic link uniquement | Choix du propriétaire. |
| Pas de replay visuel plein écran : combats en « live score » inline | Demande du propriétaire : plus léger, on suit les 10 combats d'un coup d'œil. Le log d'événements du moteur reste complet (réutilisable en phase 4). |
| Tirage : toutes les Balls à la fois, ouverture en cascade | Demande du propriétaire (animation trop longue) ; la rareté reste lisible (couleur + nombre de secousses). |
| Phase 1 : sauvegarde dans le navigateur (localStorage), `?day=AAAA-MM-JJ` pour tester un autre jour | Pas de serveur en phase 1. |
