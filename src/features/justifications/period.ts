import { shiftDay } from "@/features/attendance/report";
import {
  JUSTIFICATION_FUTURE_DAYS,
  JUSTIFICATION_MAX_SPAN_DAYS,
  JUSTIFICATION_PAST_DAYS,
  type JustificationStatus,
} from "./schemas";

/** Nombre de jours de la période, bornes comprises (dates « AAAA-MM-JJ »). */
export function periodLength(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

/** Clé d'erreur de la période, ou null si elle est acceptée (mêmes règles que la base). */
export function periodError(from: string, to: string, today: string) {
  if (from > to) return "justifications.errors.toBeforeFrom";
  if (from < shiftDay(today, -JUSTIFICATION_PAST_DAYS)) return "justifications.errors.tooOld";
  if (to > shiftDay(today, JUSTIFICATION_FUTURE_DAYS)) return "justifications.errors.tooFar";
  if (periodLength(from, to) > JUSTIFICATION_MAX_SPAN_DAYS) return "justifications.errors.tooLong";
  return null;
}

/** Ordre de préférence quand plusieurs justificatifs couvrent la même date. */
const RANK: Record<JustificationStatus, number> = { accepted: 0, pending: 1, refused: 2 };

/** Justificatif retenu pour une date : accepté plutôt qu'en attente, en attente plutôt que refusé. */
export function coveringJustification<T extends { from: string; to: string; status: JustificationStatus }>(
  date: string,
  justifications: readonly T[],
): T | null {
  let best: T | null = null;
  for (const justification of justifications) {
    if (date < justification.from || date > justification.to) continue;
    if (!best || RANK[justification.status] < RANK[best.status]) best = justification;
  }
  return best;
}
