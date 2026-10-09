/** Today's date in Europe/Paris as YYYY-MM-DD (the game day changes at midnight Paris time). */
export function parisDayKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Phase 1 testing helper: `?day=2026-10-10` plays another day. */
export function currentDayKey(): string {
  if (typeof window !== "undefined") {
    const override = new URLSearchParams(window.location.search).get("day");
    if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) return override;
  }
  return parisDayKey();
}

/** Phase 1 has no themes yet: every day uses the full pool. */
export const PHASE1_THEME = "all";
