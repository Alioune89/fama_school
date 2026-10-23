import type { MentionThresholds } from "./school-settings";

/**
 * Calcul des notes, moyennes, rangs et mentions — règles les plus courantes au Sénégal, ajustables
 * dans les paramètres de l'école (poids par type d'évaluation, seuils des mentions) :
 *
 * - une note est ramenée au barème du cycle (sur 10 à l'élémentaire, sur 20 au moyen et au secondaire) ;
 * - moyenne d'une matière : moyenne de chaque type d'évaluation (devoirs, interrogations, compositions),
 *   pondérée par le poids du type — par défaut 1, 1 et 2, soit (devoirs + interrogations + 2 × composition) ÷ 4 ;
 * - un élève absent sans justificatif a 0 ; absent excusé, l'évaluation ne compte pas pour lui ;
 * - moyenne générale : moyennes des matières pondérées par leur coefficient ;
 * - moyennes arrondies au centième (comme sur les bulletins) ; le rang se calcule sur la moyenne arrondie ;
 * - rang avec ex æquo : 1er, 2e ex æquo, 2e ex æquo, 4e ;
 * - mentions : félicitations, encouragements, tableau d'honneur ; avertissement et blâme relèvent du conseil.
 *
 * Le préscolaire n'a pas de notes chiffrées : chaque évaluation est « acquis », « en cours d'acquisition »
 * ou « non acquis ».
 */

export type Scale = "ten" | "twenty";
export type EvaluationKind = "devoir" | "interrogation" | "composition";
export type EvaluationWeights = Record<EvaluationKind, number>;

export const EVALUATION_KINDS = ["devoir", "interrogation", "composition"] as const satisfies readonly EvaluationKind[];

export const SCALE_MAX: Record<Scale, number> = { ten: 10, twenty: 20 };

/** Arrondi au centième, au plus proche (0,125 → 0,13), sans les erreurs de virgule flottante. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Note ramenée au barème : 7/10 sur 20 → 14. */
export function toScale(score: number, maxScore: number, scale: Scale): number {
  if (maxScore <= 0) throw new RangeError("Barème d'évaluation invalide");
  return (score / maxScore) * SCALE_MAX[scale];
}

export type GradeEntry = {
  kind: EvaluationKind;
  /** Note brute, ou null si l'élève était absent. */
  score: number | null;
  maxScore: number;
  /** absent : 0 ; excused : ne compte pas ; graded : note saisie. */
  status: "graded" | "absent" | "excused";
  /** Coefficient de l'évaluation au sein de son type (1 par défaut). */
  weight?: number;
};

/** Moyenne pondérée de valeurs, ou null s'il n'y a rien à moyenner. */
function weightedMean(items: { value: number; weight: number }[]): number | null {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return null;
  return items.reduce((sum, item) => sum + item.value * item.weight, 0) / total;
}

/**
 * Moyenne d'un élève dans une matière sur une période, au barème du cycle (non arrondie),
 * ou null s'il n'a aucune note qui compte.
 */
export function subjectAverage(grades: readonly GradeEntry[], scale: Scale, weights: EvaluationWeights): number | null {
  const byKind = EVALUATION_KINDS.map((kind) => {
    const counted = grades
      .filter((g) => g.kind === kind && g.status !== "excused")
      .map((g) => ({
        value: g.status === "absent" || g.score === null ? 0 : toScale(g.score, g.maxScore, scale),
        weight: g.weight ?? 1,
      }));
    return { value: weightedMean(counted), weight: weights[kind] };
  });
  return weightedMean(byKind.flatMap((k) => (k.value === null || k.weight <= 0 ? [] : [{ value: k.value, weight: k.weight }])));
}

/** Moyenne générale : moyennes des matières pondérées par leur coefficient (matières sans note ignorées). */
export function generalAverage(subjects: readonly { average: number | null; coefficient: number }[]): number | null {
  return weightedMean(
    subjects.flatMap((s) =>
      s.average === null || s.coefficient <= 0 ? [] : [{ value: round2(s.average), weight: s.coefficient }],
    ),
  );
}

/** Moyenne annuelle : moyenne des périodes notées. */
export function annualAverage(periodAverages: readonly (number | null)[]): number | null {
  return weightedMean(periodAverages.flatMap((value) => (value === null ? [] : [{ value: round2(value), weight: 1 }])));
}

export type Rank = { rank: number; exAequo: boolean };

/**
 * Rangs « à la française » sur la moyenne arrondie : 1er, 2e ex æquo, 2e ex æquo, 4e.
 * Les élèves sans moyenne ne sont pas classés.
 */
export function ranks<T extends { id: string; average: number | null }>(items: readonly T[]): Map<string, Rank> {
  const ranked = items
    .flatMap((item) => (item.average === null ? [] : [{ id: item.id, value: round2(item.average) }]))
    .sort((a, b) => b.value - a.value);
  const result = new Map<string, Rank>();
  for (const item of ranked) {
    const first = ranked.findIndex((other) => other.value === item.value);
    const tied = ranked.filter((other) => other.value === item.value).length > 1;
    result.set(item.id, { rank: first + 1, exAequo: tied });
  }
  return result;
}

export type Mention = "felicitations" | "encouragements" | "tableauHonneur";

/** Mention automatique selon la moyenne générale arrondie et les seuils de l'école. */
export function mention(average: number | null, thresholds: MentionThresholds): Mention | null {
  if (average === null) return null;
  const value = round2(average);
  if (value >= thresholds.felicitations) return "felicitations";
  if (value >= thresholds.encouragements) return "encouragements";
  if (value >= thresholds.tableauHonneur) return "tableauHonneur";
  return null;
}

export type Appreciation = "excellent" | "tresBien" | "bien" | "assezBien" | "passable" | "insuffisant" | "faible" | "tresFaible";

/** Seuils sur 20 ; sur 10, ils sont divisés par deux. */
const APPRECIATION_THRESHOLDS: [Appreciation, number][] = [
  ["excellent", 18],
  ["tresBien", 16],
  ["bien", 14],
  ["assezBien", 12],
  ["passable", 10],
  ["insuffisant", 8],
  ["faible", 5],
];

/** Appréciation proposée pour une moyenne (modifiable par l'enseignant sur le bulletin). */
export function appreciation(average: number | null, scale: Scale): Appreciation | null {
  if (average === null) return null;
  const on20 = (round2(average) / SCALE_MAX[scale]) * 20;
  return APPRECIATION_THRESHOLDS.find(([, min]) => on20 >= min)?.[0] ?? "tresFaible";
}

export type ClassStats = { average: number; highest: number; lowest: number; count: number };

/** Moyenne de la classe, plus forte et plus faible moyenne (sur les moyennes arrondies). */
export function classStats(averages: readonly (number | null)[]): ClassStats | null {
  const values = averages.flatMap((value) => (value === null ? [] : [round2(value)]));
  if (values.length === 0) return null;
  return {
    average: round2(values.reduce((sum, value) => sum + value, 0) / values.length),
    highest: Math.max(...values),
    lowest: Math.min(...values),
    count: values.length,
  };
}

/** Préscolaire : niveau d'acquisition d'une compétence. */
export type AcquisitionLevel = "acquired" | "in_progress" | "not_acquired";

/**
 * Bilan d'une matière au préscolaire : le niveau le plus fréquent ; à égalité, le plus récent
 * (les évaluations sont données dans l'ordre chronologique).
 */
export function acquisitionSummary(levels: readonly AcquisitionLevel[]): AcquisitionLevel | null {
  if (levels.length === 0) return null;
  const counts = new Map<AcquisitionLevel, number>();
  for (const level of levels) counts.set(level, (counts.get(level) ?? 0) + 1);
  const best = Math.max(...counts.values());
  for (let index = levels.length - 1; index >= 0; index--) {
    if (counts.get(levels[index]!) === best) return levels[index]!;
  }
  return null;
}
