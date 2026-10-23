import "server-only";
import {
  acquisitionSummary,
  classStats,
  generalAverage,
  ranks,
  subjectAverage,
  type ClassStats,
  type EvaluationWeights,
  type Rank,
} from "@/lib/domain/grading";
import { parseSchoolSettings } from "@/lib/domain/school-settings";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { listPeriods, listSchoolGradebooks, pickPeriod } from "../evaluations/queries";
import type { EvaluationKind } from "../evaluations/schemas";
import type { Marks, ServerSheet } from "./sheet";

const byName = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true });

/** Date ISO stable (Postgres renvoie « +00:00 », le navigateur « Z ») pour comparer les saisies. */
const iso = (value: string) => new Date(value).toISOString();

export type GradeSheetData = {
  evaluationId: string;
  title: string;
  kind: EvaluationKind;
  heldOn: string;
  /** Barème (null au préscolaire, noté en niveaux d'acquisition). */
  maxScore: number | null;
  publishedAt: string | null;
  classId: string;
  subjectId: string;
  periodId: string;
  className: string;
  subjectName: string;
  periodLabel: string;
  locked: boolean;
  scale: Enums<"grading_scale">;
  roster: { id: string; firstName: string; lastName: string }[];
  server: ServerSheet;
};

/** Feuille de notes d'une évaluation : élèves inscrits dans la classe et notes enregistrées (la RLS limite l'accès). */
export async function getGradeSheet(schoolId: string, evaluationId: string): Promise<GradeSheetData | null> {
  const supabase = await createClient();
  const { data: evaluation, error } = await supabase
    .from("evaluations")
    .select(
      "id, class_id, subject_id, period_id, kind, title, held_on, max_score, published_at, grades_entered_at, class:classes(name, level:levels(cycle:cycles(grading_scale))), subject:subjects(name), period:periods(label, locked_at), grades(student_id, status, score, acquisition)",
    )
    .eq("school_id", schoolId)
    .eq("id", evaluationId)
    .maybeSingle();
  if (error) throw error;
  if (!evaluation) return null;

  const { data: enrollments, error: rosterError } = await supabase
    .from("enrollments")
    .select("student:students(id, first_name, last_name)")
    .eq("class_id", evaluation.class_id)
    .eq("status", "active");
  if (rosterError) throw rosterError;
  const roster = (enrollments ?? [])
    .flatMap((e) => (e.student ? [{ id: e.student.id, firstName: e.student.first_name, lastName: e.student.last_name }] : []))
    .sort((a, b) => byName(a.lastName, b.lastName) || byName(a.firstName, b.firstName));

  const marks: Marks = {};
  for (const grade of evaluation.grades) {
    if (grade.status !== "graded") marks[grade.student_id] = { status: grade.status };
    else if (grade.score !== null) marks[grade.student_id] = { status: "graded", score: Number(grade.score) };
    else if (grade.acquisition !== null) marks[grade.student_id] = { status: "graded", acquisition: grade.acquisition };
  }

  return {
    evaluationId: evaluation.id,
    title: evaluation.title,
    kind: evaluation.kind,
    heldOn: evaluation.held_on,
    maxScore: evaluation.max_score === null ? null : Number(evaluation.max_score),
    publishedAt: evaluation.published_at,
    classId: evaluation.class_id,
    subjectId: evaluation.subject_id,
    periodId: evaluation.period_id,
    className: evaluation.class?.name ?? "",
    subjectName: evaluation.subject?.name ?? "",
    periodLabel: evaluation.period?.label ?? "",
    locked: evaluation.period?.locked_at != null,
    scale: evaluation.class?.level?.cycle?.grading_scale ?? "twenty",
    roster,
    server: { enteredAt: evaluation.grades_entered_at === null ? null : iso(evaluation.grades_entered_at), marks },
  };
}

export type ChildGrade = {
  evaluationId: string;
  title: string;
  kind: EvaluationKind;
  heldOn: string;
  maxScore: number | null;
  status: Enums<"grade_status">;
  score: number | null;
  acquisition: Enums<"acquisition_level"> | null;
};

export type ChildSubjectGrades = {
  id: string;
  name: string;
  coefficient: number;
  grades: ChildGrade[];
  /** Moyenne provisoire au barème du cycle (null au préscolaire ou sans note qui compte). */
  average: number | null;
  /** Préscolaire : niveau le plus fréquent. */
  summary: Enums<"acquisition_level"> | null;
};

export type ChildGrades = {
  periodLabel: string;
  scale: Enums<"grading_scale">;
  subjects: ChildSubjectGrades[];
  general: number | null;
};

/**
 * Notes publiées d'un enfant sur la période en cours, matière par matière, avec la moyenne provisoire
 * (règles de src/lib/domain/grading.ts, poids des réglages de l'école). La RLS ne renvoie au parent
 * que les notes publiées de son enfant.
 */
export async function listChildGrades(studentId: string, schoolId: string, today: string): Promise<ChildGrades | null> {
  const supabase = await createClient();
  const [periods, { data: enrollment }, { data: school }] = await Promise.all([
    listPeriods(schoolId),
    supabase
      .from("enrollments")
      .select(
        "class:classes!enrollments_class_id_school_id_fkey(level:levels(cycle:cycles(grading_scale), level_subjects(coefficient, subject:subjects(id, name, position))), year:academic_years!inner(is_current))",
      )
      .eq("student_id", studentId)
      .eq("status", "active")
      .eq("class.year.is_current", true)
      .not("class", "is", null)
      .maybeSingle(),
    supabase.from("schools").select("settings").eq("id", schoolId).maybeSingle(),
  ]);
  const period = pickPeriod(periods, today);
  const level = enrollment?.class?.level;
  if (!period || !level) return null;

  const { data, error } = await supabase
    .from("grades")
    .select(
      "status, score, acquisition, evaluation:evaluations!inner(id, title, kind, held_on, max_score, weight, period_id, subject_id)",
    )
    .eq("student_id", studentId)
    .eq("evaluation.period_id", period.id);
  if (error) throw error;

  const scale = level.cycle?.grading_scale ?? "twenty";
  const weights = parseSchoolSettings(school?.settings).evaluationWeights;
  const rows = (data ?? []).sort(
    (a, b) => a.evaluation.held_on.localeCompare(b.evaluation.held_on) || byName(a.evaluation.title, b.evaluation.title),
  );

  const subjects = level.level_subjects
    .flatMap((ls) => (ls.subject ? [{ ...ls.subject, coefficient: Number(ls.coefficient) }] : []))
    .sort((a, b) => a.position - b.position || byName(a.name, b.name))
    .flatMap((subject): ChildSubjectGrades[] => {
      const items = rows.filter((row) => row.evaluation.subject_id === subject.id);
      if (items.length === 0) return [];
      const grades = items.map((row) => ({
        evaluationId: row.evaluation.id,
        title: row.evaluation.title,
        kind: row.evaluation.kind,
        heldOn: row.evaluation.held_on,
        maxScore: row.evaluation.max_score === null ? null : Number(row.evaluation.max_score),
        status: row.status,
        score: row.score === null ? null : Number(row.score),
        acquisition: row.acquisition,
      }));
      const average =
        scale === "appreciation"
          ? null
          : subjectAverage(
              items.flatMap((row) =>
                row.evaluation.max_score === null
                  ? []
                  : [
                      {
                        kind: row.evaluation.kind,
                        score: row.score === null ? null : Number(row.score),
                        maxScore: Number(row.evaluation.max_score),
                        status: row.status,
                        weight: Number(row.evaluation.weight),
                      },
                    ],
              ),
              scale,
              weights,
            );
      const summary =
        scale === "appreciation" ? acquisitionSummary(grades.flatMap((g) => (g.acquisition ? [g.acquisition] : []))) : null;
      return [{ id: subject.id, name: subject.name, coefficient: subject.coefficient, grades, average, summary }];
    });

  return {
    periodLabel: period.label,
    scale,
    subjects,
    general: scale === "appreciation" ? null : generalAverage(subjects),
  };
}

export type AverageRow = {
  id: string;
  firstName: string;
  lastName: string;
  /** Note de chaque évaluation de la matière, dans l'ordre de `evaluations`. */
  marks: (Marks[string] | null)[];
  /** Moyenne au barème du cycle (null au préscolaire ou sans note qui compte). */
  average: number | null;
  rank: Rank | null;
  /** Préscolaire : niveau le plus fréquent. */
  summary: Enums<"acquisition_level"> | null;
  appreciation: string;
};

export type SubjectAverages = {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  coefficient: number;
  periodId: string;
  periodLabel: string;
  locked: boolean;
  scale: Enums<"grading_scale">;
  /** Poids des devoirs, interrogations et compositions dans la moyenne (réglages de l'école). */
  weights: EvaluationWeights;
  evaluations: { id: string; title: string; kind: EvaluationKind; maxScore: number | null }[];
  rows: AverageRow[];
  stats: ClassStats | null;
};

type EvaluationWithGrades = {
  kind: EvaluationKind;
  max_score: number | null;
  weight: number;
  grades: {
    student_id: string;
    status: Enums<"grade_status">;
    score: number | null;
    acquisition: Enums<"acquisition_level"> | null;
  }[];
};

/**
 * Résultat d'un élève sur des évaluations d'une même matière : sa note à chacune, sa moyenne
 * (au barème du cycle) et, au préscolaire, son niveau d'acquisition le plus fréquent.
 */
export function studentResult(
  evaluations: readonly EvaluationWithGrades[],
  studentId: string,
  scale: Enums<"grading_scale">,
  weights: EvaluationWeights,
): { marks: AverageRow["marks"]; average: number | null; summary: Enums<"acquisition_level"> | null } {
  const grades = evaluations.map((evaluation) => {
    const grade = evaluation.grades.find((g) => g.student_id === studentId);
    return grade ? { evaluation, grade } : null;
  });
  const marks = grades.map((item) => {
    if (!item) return null;
    const { status, score, acquisition } = item.grade;
    if (status !== "graded") return { status };
    if (score !== null) return { status, score: Number(score) };
    return acquisition ? { status, acquisition } : null;
  });
  if (scale === "appreciation") {
    return {
      marks,
      average: null,
      summary: acquisitionSummary(grades.flatMap((item) => (item?.grade.acquisition ? [item.grade.acquisition] : []))),
    };
  }
  const average = subjectAverage(
    grades.flatMap((item) =>
      item && item.evaluation.max_score !== null
        ? [
            {
              kind: item.evaluation.kind,
              score: item.grade.score === null ? null : Number(item.grade.score),
              maxScore: Number(item.evaluation.max_score),
              status: item.grade.status,
              weight: Number(item.evaluation.weight),
            },
          ]
        : [],
    ),
    scale,
    weights,
  );
  return { marks, average, summary: null };
}

/**
 * Moyennes d'une classe dans une matière sur une période, avec le rang et l'appréciation de chaque élève
 * (règles de src/lib/domain/grading.ts, poids des réglages de l'école). Toutes les évaluations comptent,
 * publiées ou non. Null si la classe, la matière ou la période n'existe pas pour l'année en cours.
 */
export async function getSubjectAverages(
  schoolId: string,
  classId: string,
  subjectId: string,
  periodId: string,
): Promise<SubjectAverages | null> {
  const supabase = await createClient();
  const [gradebooks, periods] = await Promise.all([listSchoolGradebooks(schoolId), listPeriods(schoolId)]);
  const klass = gradebooks.find((c) => c.id === classId);
  const subject = klass?.subjects.find((s) => s.id === subjectId);
  const period = periods.find((p) => p.id === periodId);
  if (!klass || !subject || !period) return null;

  const [evaluationsResult, enrollmentsResult, appreciationsResult, schoolResult] = await Promise.all([
    supabase
      .from("evaluations")
      .select("id, title, kind, held_on, max_score, weight, grades(student_id, status, score, acquisition)")
      .eq("class_id", classId)
      .eq("subject_id", subjectId)
      .eq("period_id", periodId)
      .order("held_on")
      .order("created_at"),
    supabase
      .from("enrollments")
      .select("student:students(id, first_name, last_name)")
      .eq("class_id", classId)
      .eq("status", "active"),
    supabase.from("subject_appreciations").select("student_id, text").eq("subject_id", subjectId).eq("period_id", periodId),
    supabase.from("schools").select("settings").eq("id", schoolId).maybeSingle(),
  ]);
  if (evaluationsResult.error) throw evaluationsResult.error;
  if (enrollmentsResult.error) throw enrollmentsResult.error;

  const scale = klass.scale;
  const weights = parseSchoolSettings(schoolResult.data?.settings).evaluationWeights;
  const evaluations = evaluationsResult.data ?? [];
  const texts = new Map((appreciationsResult.data ?? []).map((a) => [a.student_id, a.text]));
  const roster = (enrollmentsResult.data ?? [])
    .flatMap((e) => (e.student ? [e.student] : []))
    .sort((a, b) => byName(a.last_name, b.last_name) || byName(a.first_name, b.first_name));

  const rows = roster.map((student) => {
    const { marks, average, summary } = studentResult(evaluations, student.id, scale, weights);
    return {
      id: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
      marks,
      average,
      summary,
      appreciation: texts.get(student.id) ?? "",
    };
  });
  const rankMap = ranks(rows);

  return {
    classId,
    className: klass.name,
    subjectId,
    subjectName: subject.name,
    coefficient: subject.coefficient,
    periodId,
    periodLabel: period.label,
    locked: period.locked,
    scale,
    weights,
    evaluations: evaluations.map((e) => ({
      id: e.id,
      title: e.title,
      kind: e.kind,
      maxScore: e.max_score === null ? null : Number(e.max_score),
    })),
    rows: rows.map((row) => ({ ...row, rank: rankMap.get(row.id) ?? null })),
    stats: classStats(rows.map((row) => row.average)),
  };
}
