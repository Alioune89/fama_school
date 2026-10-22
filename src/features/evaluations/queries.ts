import "server-only";
import { cache } from "react";
import { hasClassTeacher } from "@/lib/domain/teaching";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { EvaluationKind } from "./schemas";

const byName = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true });

export type Period = { id: string; label: string; position: number; startsOn: string; endsOn: string; locked: boolean };

/** Périodes (semestres ou trimestres) de l'année en cours. */
export const listPeriods = cache(async (schoolId: string): Promise<Period[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("periods")
    .select("id, label, position, starts_on, ends_on, locked_at, year:academic_years!inner(is_current)")
    .eq("school_id", schoolId)
    .eq("year.is_current", true)
    .order("position");
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    label: p.label,
    position: p.position,
    startsOn: p.starts_on,
    endsOn: p.ends_on,
    locked: p.locked_at !== null,
  }));
});

/** Période demandée, sinon celle du jour, sinon la plus proche (avant la rentrée : la première). */
export function pickPeriod(periods: Period[], today: string, requested?: string | string[]): Period | null {
  return (
    periods.find((p) => p.id === requested) ??
    periods.find((p) => today >= p.startsOn && today <= p.endsOn) ??
    [...periods].reverse().find((p) => today > p.endsOn) ??
    periods[0] ??
    null
  );
}

export type ClassSubject = { id: string; name: string; coefficient: number };
export type GradebookClass = {
  id: string;
  name: string;
  cycle: Enums<"cycle_code"> | null;
  scale: Enums<"grading_scale">;
  /** Matières que l'utilisateur peut noter dans cette classe. */
  subjects: ClassSubject[];
};

/** Classes de l'année en cours et matières de leur niveau (coefficient compris). */
const listClassSubjects = cache(async (schoolId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .select(
      "id, name, homeroom_staff_id, level:levels(position, cycle:cycles(code, grading_scale), level_subjects(coefficient, subject:subjects(id, name, position, active))), year:academic_years!inner(is_current)",
    )
    .eq("school_id", schoolId)
    .eq("year.is_current", true);
  if (error) throw error;
  return (data ?? [])
    .sort((a, b) => (a.level?.position ?? 0) - (b.level?.position ?? 0) || byName(a.name, b.name))
    .map((c) => ({
      id: c.id,
      name: c.name,
      homeroomStaffId: c.homeroom_staff_id,
      cycle: c.level?.cycle?.code ?? null,
      scale: c.level?.cycle?.grading_scale ?? "twenty",
      subjects: (c.level?.level_subjects ?? [])
        .flatMap((ls) => (ls.subject?.active ? [{ ...ls.subject, coefficient: Number(ls.coefficient) }] : []))
        .sort((a, b) => a.position - b.position || byName(a.name, b.name))
        .map(({ id, name, coefficient }) => ({ id, name, coefficient })),
    }));
});

/** Toutes les classes et matières : vue de la direction. */
export async function listSchoolGradebooks(schoolId: string): Promise<GradebookClass[]> {
  return (await listClassSubjects(schoolId)).map(({ id, name, cycle, scale, subjects }) => ({
    id,
    name,
    cycle,
    scale,
    subjects,
  }));
}

/**
 * Classes et matières qu'un enseignant note : ses affectations, et toutes les matières de sa classe
 * s'il en est le titulaire au préscolaire ou à l'élémentaire (mêmes règles que private.can_grade).
 */
export async function listTeacherGradebooks(schoolId: string, userId: string): Promise<GradebookClass[]> {
  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("school_staff")
    .select("id")
    .eq("school_id", schoolId)
    .eq("user_id", userId)
    .eq("status", "active");
  const staffIds = new Set((staff ?? []).map((s) => s.id));
  if (staffIds.size === 0) return [];
  const [classes, { data: assignments }] = await Promise.all([
    listClassSubjects(schoolId),
    supabase
      .from("teaching_assignments")
      .select("class_id, subject_id")
      .in("staff_id", [...staffIds]),
  ]);
  const assigned = new Set((assignments ?? []).map((a) => `${a.class_id}:${a.subject_id}`));
  return classes.flatMap(({ homeroomStaffId, ...klass }) => {
    const titular = homeroomStaffId !== null && staffIds.has(homeroomStaffId) && hasClassTeacher(klass.cycle);
    const subjects = titular ? klass.subjects : klass.subjects.filter((s) => assigned.has(`${klass.id}:${s.id}`));
    return subjects.length > 0 ? [{ ...klass, subjects }] : [];
  });
}

export type Evaluation = {
  id: string;
  classId: string;
  subjectId: string;
  periodId: string;
  kind: EvaluationKind;
  title: string;
  heldOn: string;
  maxScore: number | null;
  weight: number;
  published: boolean;
};

/** Évaluations d'une période, pour quelques classes ou toute l'école, par date. */
export async function listEvaluations(
  schoolId: string,
  periodId: string,
  filter: { classIds?: string[]; kind?: EvaluationKind } = {},
): Promise<Evaluation[]> {
  if (filter.classIds?.length === 0) return [];
  const supabase = await createClient();
  let query = supabase
    .from("evaluations")
    .select("id, class_id, subject_id, period_id, kind, title, held_on, max_score, weight, published_at")
    .eq("school_id", schoolId)
    .eq("period_id", periodId)
    .order("held_on")
    .order("created_at")
    .limit(2000);
  if (filter.classIds) query = query.in("class_id", filter.classIds);
  if (filter.kind) query = query.eq("kind", filter.kind);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((e) => ({
    id: e.id,
    classId: e.class_id,
    subjectId: e.subject_id,
    periodId: e.period_id,
    kind: e.kind,
    title: e.title,
    heldOn: e.held_on,
    maxScore: e.max_score === null ? null : Number(e.max_score),
    weight: Number(e.weight),
    published: e.published_at !== null,
  }));
}
