import "server-only";
import { classStats, generalAverage, mention, ranks, type ClassStats, type Mention, type Rank } from "@/lib/domain/grading";
import { parseSchoolSettings } from "@/lib/domain/school-settings";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { listPeriods, listSchoolGradebooks } from "../evaluations/queries";
import { studentResult } from "./queries";

const byName = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true });

export type CouncilRow = {
  id: string;
  firstName: string;
  lastName: string;
  /** Moyenne (ou niveau d'acquisition au préscolaire) de chaque matière, dans l'ordre de `subjects`. */
  subjects: { average: number | null; summary: Enums<"acquisition_level"> | null }[];
  general: number | null;
  rank: Rank | null;
  /** Mention selon la moyenne générale et les seuils de l'école (avant décision du conseil). */
  mention: Mention | null;
  sanction: Enums<"council_sanction"> | null;
  withholdMention: boolean;
  appreciation: string;
};

export type ClassCouncil = {
  classId: string;
  className: string;
  periodId: string;
  periodLabel: string;
  locked: boolean;
  scale: Enums<"grading_scale">;
  subjects: { id: string; name: string; coefficient: number }[];
  rows: CouncilRow[];
  stats: ClassStats | null;
};

/**
 * Conseil de classe d'une période : moyenne générale de chaque élève (matières pondérées par leur
 * coefficient), rang, mention proposée, et décisions déjà enregistrées. Null si la classe ou la période
 * n'appartient pas à l'année en cours.
 */
export async function getClassCouncil(schoolId: string, classId: string, periodId: string): Promise<ClassCouncil | null> {
  const supabase = await createClient();
  const [gradebooks, periods] = await Promise.all([listSchoolGradebooks(schoolId), listPeriods(schoolId)]);
  const klass = gradebooks.find((c) => c.id === classId);
  const period = periods.find((p) => p.id === periodId);
  if (!klass || !period) return null;

  const [evaluationsResult, enrollmentsResult, decisionsResult, schoolResult] = await Promise.all([
    supabase
      .from("evaluations")
      .select("subject_id, kind, max_score, weight, grades(student_id, status, score, acquisition)")
      .eq("class_id", classId)
      .eq("period_id", periodId)
      .limit(1000),
    supabase
      .from("enrollments")
      .select("student:students(id, first_name, last_name)")
      .eq("class_id", classId)
      .eq("status", "active"),
    supabase
      .from("council_decisions")
      .select("student_id, sanction, withhold_mention, general_appreciation")
      .eq("class_id", classId)
      .eq("period_id", periodId),
    supabase.from("schools").select("settings").eq("id", schoolId).maybeSingle(),
  ]);
  if (evaluationsResult.error) throw evaluationsResult.error;
  if (enrollmentsResult.error) throw enrollmentsResult.error;
  if (decisionsResult.error) throw decisionsResult.error;

  const scale = klass.scale;
  const settings = parseSchoolSettings(schoolResult.data?.settings);
  const evaluations = evaluationsResult.data ?? [];
  const decisions = new Map((decisionsResult.data ?? []).map((d) => [d.student_id, d]));
  const roster = (enrollmentsResult.data ?? [])
    .flatMap((e) => (e.student ? [e.student] : []))
    .sort((a, b) => byName(a.last_name, b.last_name) || byName(a.first_name, b.first_name));

  const rows = roster.map((student) => {
    const subjects = klass.subjects.map((subject) => {
      const { average, summary } = studentResult(
        evaluations.filter((e) => e.subject_id === subject.id),
        student.id,
        scale,
        settings.evaluationWeights,
      );
      return { average, summary };
    });
    const general =
      scale === "appreciation"
        ? null
        : generalAverage(subjects.map((s, index) => ({ average: s.average, coefficient: klass.subjects[index]!.coefficient })));
    const decision = decisions.get(student.id);
    return {
      id: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
      subjects,
      general,
      mention: scale === "appreciation" ? null : mention(general, settings.mentionThresholds[scale]),
      sanction: decision?.sanction ?? null,
      withholdMention: decision?.withhold_mention ?? false,
      appreciation: decision?.general_appreciation ?? "",
    };
  });
  const rankMap = ranks(rows.map((row) => ({ id: row.id, average: row.general })));

  return {
    classId,
    className: klass.name,
    periodId,
    periodLabel: period.label,
    locked: period.locked,
    scale,
    subjects: klass.subjects,
    rows: rows.map((row) => ({ ...row, rank: rankMap.get(row.id) ?? null })),
    stats: classStats(rows.map((row) => row.general)),
  };
}

export type PeriodLockStatus = {
  periodId: string;
  periodLabel: string;
  lockedAt: string | null;
  /** Évaluations dont des élèves inscrits n'ont pas encore de note (ni absence). */
  incomplete: { id: string; title: string; className: string; subjectName: string; missing: number }[];
};

/** État du verrouillage d'une période et évaluations encore incomplètes dans toute l'école. */
export async function getPeriodLockStatus(schoolId: string, periodId: string): Promise<PeriodLockStatus | null> {
  const supabase = await createClient();
  const [periodResult, evaluationsResult, enrollmentsResult] = await Promise.all([
    supabase.from("periods").select("id, label, locked_at").eq("school_id", schoolId).eq("id", periodId).maybeSingle(),
    supabase
      .from("evaluations")
      .select("id, title, class_id, held_on, class:classes(name), subject:subjects(name), grades(count)")
      .eq("school_id", schoolId)
      .eq("period_id", periodId)
      .order("held_on")
      .limit(2000),
    supabase.from("enrollments").select("class_id").eq("school_id", schoolId).eq("status", "active").limit(10000),
  ]);
  if (periodResult.error) throw periodResult.error;
  if (!periodResult.data) return null;
  if (evaluationsResult.error) throw evaluationsResult.error;

  const classSizes = new Map<string, number>();
  for (const e of enrollmentsResult.data ?? []) classSizes.set(e.class_id, (classSizes.get(e.class_id) ?? 0) + 1);

  return {
    periodId,
    periodLabel: periodResult.data.label,
    lockedAt: periodResult.data.locked_at,
    incomplete: (evaluationsResult.data ?? []).flatMap((e) => {
      const missing = (classSizes.get(e.class_id) ?? 0) - (e.grades[0]?.count ?? 0);
      return missing > 0
        ? [{ id: e.id, title: e.title, className: e.class?.name ?? "", subjectName: e.subject?.name ?? "", missing }]
        : [];
    }),
  };
}
