import { round2 } from "@/lib/domain/grading";
import type { AcquisitionLevel, GradeMark } from "@/lib/offline/operations";

/** Règles de la feuille de notes, sans dépendance au navigateur ni à la base (testées dans sheet.test.ts). */

export type Marks = Record<string, GradeMark>;

/** Saisie d'une ligne : le texte tapé (note chiffrée), un niveau d'acquisition, absent ou excusé. */
export type Cell =
  { kind: "score"; text: string } | { kind: "level"; level: AcquisitionLevel } | { kind: "absent" } | { kind: "excused" };
export type Cells = Record<string, Cell>;

/** Feuille telle qu'enregistrée sur le serveur. */
export type ServerSheet = { enteredAt: string | null; marks: Marks };

/** Saisie locale : `savedAt` vaut null tant que les dernières modifications n'ont pas été enregistrées. */
export type SheetDraft = { cells: Cells; savedAt: string | null; updatedAt: string };

export const gradesRef = (evaluationId: string) => `grades:${evaluationId}`;

/**
 * Note tapée : « 12,5 », « 12.5 » ou « 12 » (deux décimales au plus). Renvoie null pour une case vide,
 * undefined pour une saisie invalide ou au-dessus du barème.
 */
export function parseScore(text: string, max: number): number | null | undefined {
  const value = text.trim().replace(",", ".");
  if (value === "") return null;
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(value)) return undefined;
  const score = Number(value);
  return score <= max ? score : undefined;
}

/** 12.5 → « 12,5 ». */
export const formatScore = (score: number) => String(round2(score)).replace(".", ",");

/** Raccourcis du clavier dans la case de note : « a » pour absent, « e » pour excusé. */
export function shortcut(text: string): "absent" | "excused" | null {
  const value = text.trim().toLowerCase();
  if (value === "a") return "absent";
  if (value === "e") return "excused";
  return null;
}

export function marksToCells(marks: Marks): Cells {
  const cells: Cells = {};
  for (const [studentId, mark] of Object.entries(marks)) {
    if (mark.status !== "graded") cells[studentId] = { kind: mark.status };
    else if ("score" in mark) cells[studentId] = { kind: "score", text: formatScore(mark.score) };
    else cells[studentId] = { kind: "level", level: mark.acquisition };
  }
  return cells;
}

/** Feuille à envoyer ; `invalid` liste les élèves dont la note tapée est invalide (l'envoi attend la correction). */
export function cellsToMarks(cells: Cells, max: number | null): { marks: Marks; invalid: string[] } {
  const marks: Marks = {};
  const invalid: string[] = [];
  for (const [studentId, cell] of Object.entries(cells)) {
    if (cell.kind === "absent" || cell.kind === "excused") marks[studentId] = { status: cell.kind };
    else if (cell.kind === "level") marks[studentId] = { status: "graded", acquisition: cell.level };
    else {
      const score = max === null ? undefined : parseScore(cell.text, max);
      if (score === undefined) invalid.push(studentId);
      else if (score !== null) marks[studentId] = { status: "graded", score };
    }
  }
  return { marks, invalid };
}

/**
 * Feuille à afficher : la saisie du téléphone si elle est plus récente que celle du serveur
 * (enregistrée ou non, pas encore envoyée), sinon celle du serveur.
 */
export function resolveSheet(server: ServerSheet, draft: SheetDraft | null): { cells: Cells; savedAt: string | null } {
  if (draft !== null && (server.enteredAt === null || draft.updatedAt > server.enteredAt)) {
    return { cells: draft.cells, savedAt: draft.savedAt };
  }
  return { cells: marksToCells(server.marks), savedAt: server.enteredAt };
}

export type SheetStats = {
  graded: number;
  absent: number;
  excused: number;
  missing: number;
  /** Moyenne, plus haute et plus basse des notes chiffrées (sur le barème de l'évaluation). */
  average: number | null;
  highest: number | null;
  lowest: number | null;
  levels: Record<AcquisitionLevel, number>;
};

/** Bilan de la feuille pour les élèves de la liste. */
export function sheetStats(marks: Marks, rosterIds: readonly string[]): SheetStats {
  const stats: SheetStats = {
    graded: 0,
    absent: 0,
    excused: 0,
    missing: 0,
    average: null,
    highest: null,
    lowest: null,
    levels: { acquired: 0, in_progress: 0, not_acquired: 0 },
  };
  const scores: number[] = [];
  for (const id of rosterIds) {
    const mark = marks[id];
    if (!mark) stats.missing += 1;
    else if ("score" in mark) {
      stats.graded += 1;
      scores.push(mark.score);
    } else if ("acquisition" in mark) {
      stats.graded += 1;
      stats.levels[mark.acquisition] += 1;
    } else stats[mark.status] += 1;
  }
  if (scores.length > 0) {
    stats.average = round2(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    stats.highest = Math.max(...scores);
    stats.lowest = Math.min(...scores);
  }
  return stats;
}
