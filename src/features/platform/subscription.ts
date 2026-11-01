/**
 * État de l'abonnement d'une école d'après le dernier jour couvert (pilote ou abonnement payé) : à jour, se
 * termine bientôt (rappel à faire), échu (à régulariser) ou date à définir.
 */
export type SubscriptionState = "unset" | "active" | "endingSoon" | "expired";

export const SUBSCRIPTION_TONE = {
  unset: "neutral",
  active: "success",
  endingSoon: "warning",
  expired: "danger",
} as const satisfies Record<SubscriptionState, string>;

/** Jours avant la fin à partir desquels l'équipe relance l'école. */
export const ENDING_SOON_DAYS = 15;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Jours entre deux dates AAAA-MM-JJ (positif si `to` est après `from`). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export function subscriptionState(endsOn: string | null, today: string): { state: SubscriptionState; days: number | null } {
  if (!endsOn) return { state: "unset", days: null };
  const days = daysBetween(today, endsOn);
  if (days < 0) return { state: "expired", days: -days };
  return { state: days <= ENDING_SOON_DAYS ? "endingSoon" : "active", days };
}

/** Dernier jour du mois de `date`, ou d'un mois suivant (fin de la période couverte par un paiement mensuel). */
export function endOfMonth(date: string, monthsAhead = 0): string {
  const [year, month] = date.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(year, month + monthsAhead, 0)).toISOString().slice(0, 10);
}

/** Période proposée pour un nouveau paiement : le mois qui suit la fin actuelle, ou le mois en cours si échu. */
export function suggestedCoverage(endsOn: string | null, today: string): string {
  return endsOn && endsOn >= today ? endOfMonth(endsOn, 1) : endOfMonth(today);
}
