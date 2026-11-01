/**
 * Santé d'une école cliente : l'utilise-t-elle encore ? Sert à rappeler une école avant qu'elle abandonne.
 * Activité = dernier appel, dernière note ou dernier encaissement saisi.
 */
export type SchoolHealth = "setup" | "active" | "slowing" | "inactive";

export const HEALTH_TONE = {
  setup: "info",
  active: "success",
  slowing: "warning",
  inactive: "danger",
} as const satisfies Record<SchoolHealth, string>;

/** Jours sans activité au-delà desquels l'école ralentit, puis est considérée inactive. */
export const SLOWING_AFTER_DAYS = 7;
export const INACTIVE_AFTER_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysSince(date: string | null, now: Date): number | null {
  if (!date) return null;
  return Math.max(0, Math.floor((now.getTime() - new Date(date).getTime()) / DAY_MS));
}

/** La plus récente de plusieurs dates ISO (null si aucune). */
export function latest(...dates: (string | null | undefined)[]): string | null {
  return dates.reduce<string | null>((best, date) => (date && (!best || new Date(date) > new Date(best)) ? date : best), null);
}

export function schoolHealth({
  activeStudents,
  lastActivity,
  now,
}: {
  activeStudents: number;
  lastActivity: string | null;
  now: Date;
}): SchoolHealth {
  // Sans élèves, l'école est encore en train de se mettre en place.
  if (activeStudents === 0) return "setup";
  const days = daysSince(lastActivity, now);
  if (days === null || days > INACTIVE_AFTER_DAYS) return "inactive";
  return days > SLOWING_AFTER_DAYS ? "slowing" : "active";
}
