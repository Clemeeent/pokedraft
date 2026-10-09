import type { DraftState } from "@/engine";

/** Phase 1 persistence: everything lives in this browser's localStorage. */
const PREFIX = "pokedraft:";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode): the game still works for this session.
  }
}

export function getPlayerId(): string {
  let id = read<string>("playerId");
  if (!id) {
    id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()).slice(2);
    write("playerId", id);
  }
  return id;
}

export interface SavedDay {
  draft: DraftState;
  /** The initial roster reveal animation was seen. */
  revealed: boolean;
  /** The live battle sequence after lock was seen (or skipped). */
  battlesWatched?: boolean;
}

export const loadDay = (dayKey: string) => read<SavedDay>(`day:${dayKey}`);
export const saveDay = (dayKey: string, day: SavedDay) => write(`day:${dayKey}`, day);
export function clearDay(dayKey: string) {
  try {
    localStorage.removeItem(`${PREFIX}day:${dayKey}`);
  } catch {
    // ignore
  }
}

export interface Settings {
  fastAnimations: boolean;
}
export const loadSettings = (): Settings => read<Settings>("settings") ?? { fastAnimations: false };
export const saveSettings = (s: Settings) => write("settings", s);
