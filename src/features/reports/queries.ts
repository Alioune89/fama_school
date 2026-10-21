import "server-only";
import type { ReportCategory } from "@/lib/offline/operations";
import { createClient } from "@/lib/supabase/server";

export type StudentReport = {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  category: ReportCategory;
  message: string;
  occurredAt: string;
  authorName: string;
};

const SELECT =
  "id, student_id, category, message, occurred_at, author_name, student:students(first_name, last_name), class:classes(name)";

type Row = {
  id: string;
  student_id: string;
  category: ReportCategory;
  message: string;
  occurred_at: string;
  author_name: string;
  student: { first_name: string; last_name: string } | null;
  class: { name: string } | null;
};

const toReport = (row: Row): StudentReport => ({
  id: row.id,
  studentId: row.student_id,
  studentName: row.student ? `${row.student.first_name} ${row.student.last_name}` : "",
  className: row.class?.name ?? "",
  category: row.category,
  message: row.message,
  occurredAt: new Date(row.occurred_at).toISOString(),
  authorName: row.author_name,
});

/** Signalements d'un élève, du plus récent au plus ancien (direction, parent : la RLS filtre). */
export async function listStudentReports(studentId: string, limit = 50): Promise<StudentReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_reports")
    .select(SELECT)
    .eq("student_id", studentId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toReport);
}

/** Derniers signalements faits par l'utilisateur dans l'école. */
export async function listMyReports(schoolId: string, userId: string, limit = 20): Promise<StudentReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_reports")
    .select(SELECT)
    .eq("school_id", schoolId)
    .eq("created_by", userId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toReport);
}
