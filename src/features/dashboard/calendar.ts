/** Dates « AAAA-MM-JJ » (Dakar est à UTC toute l'année : la date du jour est celle d'UTC). */
const DAY = 24 * 60 * 60 * 1000;
const toTime = (date: string) => Date.parse(`${date}T00:00:00Z`);
const daysBetween = (from: string, to: string) => Math.round((toTime(to) - toTime(from)) / DAY);

export const todayInDakar = (now: Date = new Date()) => now.toISOString().slice(0, 10);

type Period = { id: string; position: number; label: string; starts_on: string; ends_on: string; locked_at: string | null };

export type CalendarPeriod = Period & { state: "past" | "current" | "upcoming"; progress: number };

export type SchoolCalendar = {
  phase: "before" | "during" | "after";
  /** Jours avant la rentrée (phase before) ou avant la fin de l'année (phase during). */
  daysLeft: number;
  /** Avancement de l'année, de 0 à 100. */
  yearProgress: number;
  periods: CalendarPeriod[];
};

const progress = (start: string, end: string, today: string) => {
  const total = daysBetween(start, end);
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((daysBetween(start, today) / total) * 100)));
};

/** Où en est l'année scolaire aujourd'hui : période en cours, avancement, jours restants. */
export function schoolCalendar(year: { startsOn: string; endsOn: string; periods: Period[] }, today: string): SchoolCalendar {
  const phase = today < year.startsOn ? "before" : today > year.endsOn ? "after" : "during";
  return {
    phase,
    daysLeft: phase === "before" ? daysBetween(today, year.startsOn) : phase === "during" ? daysBetween(today, year.endsOn) : 0,
    yearProgress: progress(year.startsOn, year.endsOn, today),
    periods: [...year.periods]
      .sort((a, b) => a.position - b.position)
      .map((period) => ({
        ...period,
        state: today > period.ends_on ? "past" : today < period.starts_on ? "upcoming" : "current",
        progress: progress(period.starts_on, period.ends_on, today),
      })),
  };
}
