/** Horaires de réponse d'un professeur : jours (1 = lundi … 7 = dimanche) et heures « 08:00 ». */
export type Availability = { days: number[]; startsAt: string; endsAt: string };

export const DEFAULT_AVAILABILITY: Availability = { days: [1, 2, 3, 4, 5], startsAt: "08:00", endsAt: "18:00" };

/** Jour de la semaine (1 = lundi) et heure « HH:MM » à Dakar (UTC toute l'année). */
function dakarNow(now: Date) {
  const day = now.getUTCDay() === 0 ? 7 : now.getUTCDay();
  return { day, time: now.toISOString().slice(11, 16) };
}

/** Le professeur est-il dans ses horaires de réponse en ce moment ? */
export function isAvailableNow(availability: Availability, now: Date = new Date()): boolean {
  const { day, time } = dakarNow(now);
  return availability.days.includes(day) && time >= availability.startsAt && time < availability.endsAt;
}

/** Jours groupés pour l'affichage : [1,2,3,4,5] → [[1,5]] ; [1,3,4] → [[1,1],[3,4]]. */
export function dayRanges(days: number[]): [number, number][] {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const ranges: [number, number][] = [];
  for (const day of sorted) {
    const last = ranges.at(-1);
    if (last && day === last[1] + 1) last[1] = day;
    else ranges.push([day, day]);
  }
  return ranges;
}
