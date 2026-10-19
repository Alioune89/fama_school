/**
 * Calendrier scolaire sénégalais : l'année va d'octobre à juillet.
 * Les dates sont manipulées en chaînes ISO « AAAA-MM-JJ » (pas de fuseau horaire en jeu).
 */

export type PeriodKind = "semester" | "trimester";

export type AcademicYearDraft = {
  label: string;
  startsOn: string;
  endsOn: string;
};

export type PeriodDraft = {
  position: number;
  label: string;
  startsOn: string;
  endsOn: string;
};

const iso = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

/** Année scolaire en cours ou à venir : à partir de juillet, on prépare la rentrée suivante. */
export function defaultAcademicYear(today: Date): AcademicYearDraft {
  const month = today.getUTCMonth() + 1;
  const startYear = month >= 7 ? today.getUTCFullYear() : today.getUTCFullYear() - 1;
  return {
    label: `${startYear}-${startYear + 1}`,
    startsOn: iso(startYear, 10, 1),
    endsOn: iso(startYear + 1, 7, 31),
  };
}

export function parseYearLabel(label: string): { startYear: number; endYear: number } | null {
  const match = /^(\d{4})-(\d{4})$/.exec(label);
  if (!match) return null;
  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  return endYear === startYear + 1 ? { startYear, endYear } : null;
}

function dayBefore(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Découpage proposé par défaut, calé sur les congés habituels :
 * semestres coupés mi-février ; trimestres aux vacances de Noël et de Pâques (début avril).
 */
export function buildPeriods(year: AcademicYearDraft, kind: PeriodKind): PeriodDraft[] {
  const parsed = parseYearLabel(year.label);
  if (!parsed) throw new Error(`Libellé d'année invalide : ${year.label}`);
  const { endYear } = parsed;

  const breaks =
    kind === "semester"
      ? [iso(endYear, 2, 16)]
      : [iso(endYear, 1, 5), iso(endYear, 4, 6)];

  const starts = [year.startsOn, ...breaks];
  const labels =
    kind === "semester" ? ["1er semestre", "2e semestre"] : ["1er trimestre", "2e trimestre", "3e trimestre"];

  return starts.map((startsOn, index) => ({
    position: index + 1,
    label: labels[index]!,
    startsOn,
    endsOn: index < starts.length - 1 ? dayBefore(starts[index + 1]!) : year.endsOn,
  }));
}

/** Âge révolu à une date donnée (affichage des fiches élèves). */
export function ageOn(birthDate: string, on: Date): number {
  const birth = new Date(`${birthDate}T00:00:00Z`);
  let age = on.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    on.getUTCMonth() < birth.getUTCMonth() ||
    (on.getUTCMonth() === birth.getUTCMonth() && on.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}
