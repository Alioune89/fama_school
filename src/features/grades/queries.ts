import "server-only";
import { acquisitionSummary, generalAverage, subjectAverage } from "@/lib/domain/grading";
import { parseSchoolSettings } from "@/lib/domain/school-settings";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { listPeriods, pickPeriod } from "../evaluations/queries";
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
