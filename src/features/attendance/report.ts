import type { AttendanceSlot, AttendanceStatus } from "@/lib/offline/operations";

/** Calculs des tableaux de présence de la direction (testés dans report.test.ts). Dates « AAAA-MM-JJ », Dakar = UTC. */

const DAY = 24 * 60 * 60 * 1000;
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (date: Date) => date.toISOString().slice(0, 10);

export function shiftDay(iso: string, days: number): string {
  return toIso(new Date(toDate(iso).getTime() + days * DAY));
}

/** « 2026-10 » → « 2026-11 » (delta = 1) ou « 2026-09 » (delta = -1). */
export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number) as [number, number];
  const date = new Date(Date.UTC(year, m - 1 + delta, 1));
  return toIso(date).slice(0, 7);
}

export const isValidMonth = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
export const isValidDay = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(toDate(value).getTime());

/**
 * Jours de classe d'un mois jusqu'à aujourd'hui : du lundi au vendredi, plus tout jour
 * où un appel a été fait (samedi matin dans certaines écoles).
 */
export function monthDays(month: string, today: string, daysWithRollCall: Set<string>): string[] {
  const days: string[] = [];
  for (let date = toDate(`${month}-01`); toIso(date).startsWith(month); date = new Date(date.getTime() + DAY)) {
    const iso = toIso(date);
    if (iso > today) break;
    const weekday = date.getUTCDay();
    if ((weekday >= 1 && weekday <= 5) || daysWithRollCall.has(iso)) days.push(iso);
  }
  return days;
}

/** Statut d'un élève à un créneau : absent du tableau si l'appel n'a pas été fait. */
export type DayMarks = Partial<Record<AttendanceSlot, AttendanceStatus>>;

export type DayCell = { kind: "none" | "present" | "late" | "absent" | "halfAbsent"; marks: DayMarks };

/** Case d'une journée : absent toute la journée, une demi-journée, en retard, présent, ou pas d'appel. */
export function dayCell(marks: DayMarks): DayCell {
  const values = Object.values(marks);
  if (values.length === 0) return { kind: "none", marks };
  const absent = values.filter((status) => status === "absent").length;
  if (absent > 0) return { kind: absent === values.length ? "absent" : "halfAbsent", marks };
  if (values.includes("late")) return { kind: "late", marks };
  return { kind: "present", marks };
}

/** Taux de présence (en %, arrondi) : les retards comptent comme présents. Null sans aucun appel. */
export function attendanceRate(marks: number, absences: number): number | null {
  if (marks === 0) return null;
  return Math.round(((marks - absences) / marks) * 100);
}
