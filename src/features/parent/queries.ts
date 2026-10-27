import "server-only";
import { cache } from "react";
import { shiftDay } from "@/features/attendance/report";
import type { AttendanceSlot, AttendanceStatus } from "@/lib/offline/operations";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const byName = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true });

export type Child = {
  id: string;
  firstName: string;
  lastName: string;
  schoolId: string;
  schoolName: string;
  className: string | null;
};

/** Enfants rattachés au compte du parent, toutes écoles confondues. */
export const listMyChildren = cache(async (userId: string): Promise<Child[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("guardians")
    .select(
      "student_guardians(student:students(id, first_name, last_name, school_id, school:schools(name), enrollments(status, class:classes!enrollments_class_id_school_id_fkey(name, year:academic_years(is_current)))))",
    )
    .eq("user_id", userId);
  if (error) throw error;

  const children = new Map<string, Child>();
  for (const guardian of data ?? []) {
    for (const link of guardian.student_guardians) {
      const student = link.student;
      if (!student || children.has(student.id)) continue;
      const current = student.enrollments.find((e) => e.status === "active" && e.class?.year?.is_current);
      children.set(student.id, {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        schoolId: student.school_id,
        schoolName: student.school?.name ?? "",
        className: current?.class?.name ?? null,
      });
    }
  }
  return [...children.values()].sort((a, b) => byName(a.firstName, b.firstName));
});

export type ChildAbsence = {
  date: string;
  slot: AttendanceSlot | null;
  status: Exclude<AttendanceStatus, "present">;
  className: string;
  /** Heure de l'appel. */
  takenAt: string | null;
};

/** Absences et retards d'enfants sur une période (la RLS limite aux enfants du parent). */
export async function listChildrenAbsences(studentIds: string[], from: string): Promise<Map<string, ChildAbsence[]>> {
  const result = new Map<string, ChildAbsence[]>();
  if (studentIds.length === 0) return result;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance_records")
    .select("student_id, date, status, session:attendance_sessions(slot, taken_at, class:classes(name))")
    .in("student_id", studentIds)
    .gte("date", from)
    .neq("status", "present")
    .order("date", { ascending: false })
    .limit(500);
  if (error) throw error;
  for (const row of data ?? []) {
    const list = result.get(row.student_id) ?? [];
    list.push({
      date: row.date,
      slot: row.session?.slot ?? null,
      status: row.status as ChildAbsence["status"],
      className: row.session?.class?.name ?? "",
      takenAt: row.session ? new Date(row.session.taken_at).toISOString() : null,
    });
    result.set(row.student_id, list);
  }
  for (const list of result.values()) {
    list.sort((a, b) => b.date.localeCompare(a.date) || (a.slot === "morning" ? 1 : -1));
  }
  return result;
}

/** Nombre de signalements récents par enfant. */
export async function countRecentReports(studentIds: string[], since: string): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (studentIds.length === 0) return counts;
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_reports")
    .select("student_id")
    .in("student_id", studentIds)
    .gte("occurred_at", `${since}T00:00:00Z`);
  for (const row of data ?? []) counts.set(row.student_id, (counts.get(row.student_id) ?? 0) + 1);
  return counts;
}

/** Période affichée au parent : les 30 derniers jours. */
export const PARENT_WINDOW_DAYS = 30;
export const parentWindowStart = (today: string) => shiftDay(today, -(PARENT_WINDOW_DAYS - 1));

export type ChildLastGrade = {
  subject: string;
  title: string;
  heldOn: string;
  status: Enums<"grade_status">;
  score: number | null;
  maxScore: number | null;
  acquisition: Enums<"acquisition_level"> | null;
};

/** Dernière note publiée de chaque enfant (la RLS ne renvoie au parent que les notes publiées). */
export async function listLastGrades(studentIds: string[]): Promise<Map<string, ChildLastGrade>> {
  const result = new Map<string, ChildLastGrade>();
  if (studentIds.length === 0) return result;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grades")
    .select(
      "student_id, status, score, acquisition, evaluation:evaluations!inner(title, held_on, max_score, subject:subjects(name))",
    )
    .in("student_id", studentIds)
    .limit(1000);
  if (error) throw error;
  const rows = (data ?? []).sort((a, b) => b.evaluation.held_on.localeCompare(a.evaluation.held_on));
  for (const row of rows) {
    if (result.has(row.student_id)) continue;
    result.set(row.student_id, {
      subject: row.evaluation.subject?.name ?? "",
      title: row.evaluation.title,
      heldOn: row.evaluation.held_on,
      status: row.status,
      score: row.score === null ? null : Number(row.score),
      maxScore: row.evaluation.max_score === null ? null : Number(row.evaluation.max_score),
      acquisition: row.acquisition,
    });
  }
  return result;
}

export type UpcomingComposition = { subject: string; title: string; heldOn: string };

/** Prochaine composition de chaque enfant, dans les 60 jours (public.upcoming_compositions). */
export async function listUpcomingCompositions(studentIds: string[]): Promise<Map<string, UpcomingComposition>> {
  const result = new Map<string, UpcomingComposition>();
  if (studentIds.length === 0) return result;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("upcoming_compositions", { p_student_ids: studentIds });
  if (error) throw error;
  for (const item of (data ?? []) as (UpcomingComposition & { studentId: string })[]) {
    result.set(item.studentId, { subject: item.subject, title: item.title, heldOn: item.heldOn });
  }
  return result;
}

export type ChildBalance = { due: number; overdue: number };

/** Reste à payer de chaque enfant, dont la part échue (factures non annulées). */
export async function listBalances(studentIds: string[], today: string): Promise<Map<string, ChildBalance>> {
  const result = new Map<string, ChildBalance>();
  if (studentIds.length === 0) return result;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("student_id, total, amount_paid, due_on")
    .in("student_id", studentIds)
    .is("cancelled_at", null)
    .limit(2000);
  if (error) throw error;
  for (const invoice of data ?? []) {
    const remaining = Math.max(0, invoice.total - invoice.amount_paid);
    if (remaining === 0) continue;
    const balance = result.get(invoice.student_id) ?? { due: 0, overdue: 0 };
    balance.due += remaining;
    if (invoice.due_on < today) balance.overdue += remaining;
    result.set(invoice.student_id, balance);
  }
  return result;
}
