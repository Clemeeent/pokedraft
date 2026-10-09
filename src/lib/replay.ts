import { computeStats, type Ailment, type BattleEvent, type BattleTeam, type Dex, type Side } from "@/engine";

export interface FighterView {
  slot: number;
  hp: number;
  maxHp: number;
  status: Ailment | null;
  fainted: boolean;
}

export interface ReplayFrame {
  message: string;
  /** Active slot per side. */
  active: [number, number];
  /** Every team member's state per side. */
  teams: [FighterView[], FighterView[]];
  energy: [number, number];
  turn: number;
  /** Visual cue for the frame. */
  effect: { kind: "hit" | "super" | "faint" | "none"; side: Side };
}

const STAT_NAMES = { atk: "Attack", def: "Defense", spa: "Sp. Atk", spd: "Sp. Def", spe: "Speed" } as const;
const STATUS_TEXT: Record<Ailment, string> = { burn: "was burned", paralysis: "is paralyzed", poison: "was poisoned" };

/** Turns the engine's event log into the messages and HP states shown by the replay. */
export function buildReplay(events: BattleEvent[], teams: [BattleTeam, BattleTeam], dex: Dex): ReplayFrame[] {
  const nameOf = (side: Side, slot: number) => {
    const n = dex.speciesById.get(teams[side].members[slot].speciesId)!.name;
    return side === 0 ? n : `Foe ${n}`;
  };
  const state = {
    active: [0, 0] as [number, number],
    teams: teams.map((t) =>
      t.members.map((_, slot) => ({ slot, hp: 0, maxHp: 1, status: null as Ailment | null, fainted: false })),
    ) as [FighterView[], FighterView[]],
    energy: [0, 0] as [number, number],
    turn: 0,
  };
  const frames: ReplayFrame[] = [];
  const push = (message: string, effect: ReplayFrame["effect"] = { kind: "none", side: 0 }) =>
    frames.push({
      message,
      active: [...state.active],
      teams: [state.teams[0].map((f) => ({ ...f })), state.teams[1].map((f) => ({ ...f }))],
      energy: [...state.energy],
      turn: state.turn,
      effect,
    });
  const setHp = (side: Side, slot: number, hp: number, maxHp: number) => {
    state.teams[side][slot].hp = hp;
    state.teams[side][slot].maxHp = maxHp;
  };

  // Every Pokémon starts at full HP (known from its first appearance in the log).
  for (const e of events) {
    if ((e.kind === "send-out" || e.kind === "switch") && state.teams[e.side][e.kind === "switch" ? e.toSlot : e.slot].hp === 0) {
      setHp(e.side, e.kind === "switch" ? e.toSlot : e.slot, e.hp, e.maxHp);
    }
  }
  for (const side of [0, 1] as const) {
    for (const f of state.teams[side]) {
      if (f.hp === 0) {
        const species = dex.speciesById.get(teams[side].members[f.slot].speciesId)!;
        f.maxHp = f.hp = computeStats(species.baseStats).hp;
      }
    }
  }

  for (const e of events) {
    switch (e.kind) {
      case "send-out":
        state.active[e.side] = e.slot;
        push(e.side === 0 ? `Go! ${nameOf(0, e.slot)}!` : `${teams[1].name} sent out ${nameOf(1, e.slot).replace("Foe ", "")}!`);
        break;
      case "turn":
        state.turn = e.turn;
        state.energy = [...e.energy];
        break;
      case "move":
        state.energy[e.side] = e.energyLeft;
        push(`${nameOf(e.side, e.slot)} used ${dex.movesById.get(e.moveId)?.name ?? "Struggle"}!`);
        break;
      case "miss":
        push(`${nameOf(e.side, e.slot)}'s attack missed!`);
        break;
      case "immune":
        push(`It doesn't affect ${nameOf(e.side, e.slot)}…`);
        break;
      case "damage": {
        setHp(e.side, e.slot, e.hp, e.maxHp);
        const notes = [
          e.hits > 1 ? `Hit ${e.hits} times!` : "",
          e.crit ? "A critical hit!" : "",
          e.effectiveness > 1 ? "It's super effective!" : e.effectiveness < 1 ? "It's not very effective…" : "",
        ].filter(Boolean);
        push(notes.join(" ") || `${nameOf(e.side, e.slot)} took ${e.amount} damage.`, {
          kind: e.effectiveness > 1 ? "super" : "hit",
          side: e.side,
        });
        break;
      }
      case "status":
        state.teams[e.side][e.slot].status = e.status;
        push(`${nameOf(e.side, e.slot)} ${STATUS_TEXT[e.status]}!`);
        break;
      case "stat": {
        const amount = Math.abs(e.change) >= 2 ? " sharply" : "";
        push(`${nameOf(e.side, e.slot)}'s ${STAT_NAMES[e.stat]}${amount} ${e.change > 0 ? "rose" : "fell"}!`);
        break;
      }
      case "status-damage":
        setHp(e.side, e.slot, e.hp, e.maxHp);
        push(`${nameOf(e.side, e.slot)} is hurt by its ${e.status === "burn" ? "burn" : "poison"}!`, { kind: "hit", side: e.side });
        break;
      case "recoil":
        setHp(e.side, e.slot, e.hp, e.maxHp);
        push(`${nameOf(e.side, e.slot)} is damaged by recoil!`, { kind: "hit", side: e.side });
        break;
      case "drain":
        setHp(e.side, e.slot, e.hp, e.maxHp);
        push(`${nameOf(e.side, e.slot)} restored some HP!`);
        break;
      case "paralyzed":
        push(`${nameOf(e.side, e.slot)} is paralyzed! It can't move!`);
        break;
      case "switch":
        state.active[e.side] = e.toSlot;
        push(`${nameOf(e.side, e.fromSlot)}, come back! Go, ${nameOf(e.side, e.toSlot).replace("Foe ", "")}!`);
        break;
      case "faint":
        state.teams[e.side][e.slot].fainted = true;
        state.teams[e.side][e.slot].hp = 0;
        push(`${nameOf(e.side, e.slot)} fainted!`, { kind: "faint", side: e.side });
        break;
      case "end":
        push(
          e.reason === "timeout"
            ? `Time's up! ${e.winner === 0 ? "You win" : "You lose"} on remaining HP.`
            : e.winner === 0
              ? `You defeated ${teams[1].name}!`
              : `You lost to ${teams[1].name}…`,
        );
        break;
    }
  }
  return frames;
}
