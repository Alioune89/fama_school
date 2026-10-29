export type ChapterStatus = "todo" | "in_progress" | "done" | "validated";

export type ProgressSummary = {
  total: number;
  validated: number;
  /** Terminés, en attente de validation. */
  done: number;
  inProgress: number;
  /** Chapitres dont le mois visé est passé : ils devraient être terminés. */
  expected: number;
  /** Chapitres en retard (mois visé passé, pas terminés) ; négatif : chapitres terminés en avance sur leur mois. */
  delay: number;
  state: "ahead" | "onTrack" | "behind";
};

/**
 * Avancement d'une classe dans le programme d'une matière. Un chapitre « terminé » compte comme fait même avant
 * la validation. En retard : mois visé passé sans être fait (« 2026-11-01 » est en retard dès décembre).
 * En avance : déjà fait alors que son mois visé est à venir. Un chapitre fait dans son mois est dans les temps.
 */
export function summarizeProgress(
  chapters: { id: string; targetMonth: string | null }[],
  statuses: Map<string, ChapterStatus>,
  today: string,
): ProgressSummary {
  const monthStart = `${today.slice(0, 7)}-01`;
  const status = (id: string) => statuses.get(id) ?? "todo";
  const finished = (id: string) => status(id) === "done" || status(id) === "validated";
  const expected = chapters.filter((c) => c.targetMonth !== null && c.targetMonth < monthStart);
  const behind = expected.filter((c) => !finished(c.id)).length;
  const ahead = chapters.filter((c) => c.targetMonth !== null && c.targetMonth > monthStart && finished(c.id)).length;
  return {
    total: chapters.length,
    validated: chapters.filter((c) => status(c.id) === "validated").length,
    done: chapters.filter((c) => status(c.id) === "done").length,
    inProgress: chapters.filter((c) => status(c.id) === "in_progress").length,
    expected: expected.length,
    delay: behind > 0 ? behind : -ahead,
    state: behind > 0 ? "behind" : ahead > 0 ? "ahead" : "onTrack",
  };
}
