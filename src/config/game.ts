/**
 * All balancing values live here. Change numbers here, not in the engine code.
 */

export const DRAFT = {
  rosterSize: 6,
  teamSize: 3,
  rerollsPerDay: 3,
  /** Reroll cost per constraint. */
  rerollCost: { sameType: 1, sameGeneration: 1, free: 2 },
  /** Number of options proposed by one reroll. */
  rerollOptions: 3,
  /** Max legendary + mythical Pokémon in one roster. */
  maxLegendariesPerRoster: 1,
  /** Draw weight of a legendary/mythical compared to a regular Pokémon (1). */
  legendaryWeight: 0.25,
  /** Draw weight of baby Pokémon (very weak, rarely fun). */
  babyWeight: 0.5,
  /** Shiny chance per drawn Pokémon (cosmetic only). */
  shinyChance: 1 / 500,
  /** Minimum size of the day's pool; restrictive themes are widened up to this. */
  minPoolSize: 150,
} as const;

/** Poké Ball shown before a reveal, chosen from base stat total (BST). */
export const BALL_TIERS = {
  /** BST >= value → tier. Legendary / mythical always get the Master Ball. */
  great: 400,
  ultra: 500,
} as const;

export const BATTLE = {
  level: 50,
  iv: 31,
  ev: 0,
  /** Safety cap: after this many turns the team with the most HP % left wins. */
  maxTurns: 100,
  /** Damage is multiplied by a random value in [1 - variance, 1]. Real games: 0.15. */
  damageVariance: 0.15,
  critChance: 1 / 24,
  /** Crit chance for "high crit ratio" moves (crit_rate 1 in PokéAPI). */
  highCritChance: 1 / 8,
  critMultiplier: 1.5,
  stabMultiplier: 1.5,
  burnPhysicalMultiplier: 0.5,
  burnDamageFraction: 1 / 16,
  poisonDamageFraction: 1 / 8,
  paralysisSpeedMultiplier: 0.5,
  paralysisSkipChance: 0.25,
  /** Each active Pokémon may be switched out by the AI at most this many times per battle. */
  maxSwitchOutsPerPokemon: 1,
  /**
   * The AI switches when its best move does at most `switchIfOwnBestEffectiveness` and the
   * opponent hits it for at least `switchIfThreatEffectiveness`, and a bench Pokémon does better.
   */
  switchIfOwnBestEffectiveness: 0.5,
  switchIfThreatEffectiveness: 2,
} as const;

export const ENERGY = {
  /** Energy of a Pokémon when it first enters the battle. */
  start: 0,
  /** Energy gained by the active Pokémon at the start of each turn. */
  perTurn: 20,
  max: 100,
  /** Moves with power <= freePower cost 0 energy. */
  freePower: 40,
  /** Each point of power above freePower costs this much energy. */
  costPerPower: 0.5,
} as const;

export const MOVESET = {
  movesPerPokemon: 4,
  /** Score multiplier for a move using the Pokémon's weaker attacking stat. */
  offStatFactorFloor: 0.5,
  /**
   * Moves never picked: charge/recharge turns, self-KO, situational or random moves the
   * simplified engine does not model.
   */
  excludedMoves: [
    "hyper-beam", "giga-impact", "blast-burn", "hydro-cannon", "frenzy-plant", "rock-wrecker",
    "roar-of-time", "prismatic-laser", "eternabeam", "meteor-assault", "solar-beam", "solar-blade",
    "sky-attack", "skull-bash", "razor-wind", "meteor-beam", "electro-shot", "freeze-shock",
    "ice-burn", "fly", "dig", "dive", "bounce", "phantom-force", "shadow-force", "sky-drop",
    "self-destruct", "explosion", "misty-explosion", "focus-punch", "future-sight", "doom-desire",
    "dream-eater", "synchronoise", "belch", "last-resort", "fake-out", "first-impression",
    "snore", "spit-up", "natural-gift", "fling", "rollout", "ice-ball", "uproar", "steel-beam",
    "mind-blown", "chloroblast", "burn-up", "double-shock", "shell-trap", "present", "struggle",
    "sucker-punch", "thunderclap", "upper-hand", "steel-roller", "stored-power",
  ],
} as const;

export const SCORING = {
  pointsPerWin: 3,
  /** Opponent strength multiplies the points of a win, clamped to this range. */
  minOpponentFactor: 0.8,
  maxOpponentFactor: 1.2,
} as const;

export const BOTS = {
  /** Battles played by every team when it is locked. */
  battlesPerTeam: 10,
  /** Bots generated per day (phase 1: the opponents of the local player). */
  botsPerDay: 30,
  /** A bot rerolls a slot whose BST is below this value. */
  rerollBelowBst: 420,
} as const;
