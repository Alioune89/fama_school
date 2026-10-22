import "server-only";
import { createClient } from "@/lib/supabase/server";
import { JUSTIFICATION_BUCKET, type JustificationReason, type JustificationStatus } from "./schemas";

export type Justification = {
  id: string;
  studentId: string;
  from: string;
  to: string;
  reason: JustificationReason;
  comment: string | null;
  status: JustificationStatus;
  createdAt: string;
  submittedBy: string | null;
  submittedByName: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
  reviewNote: string | null;
  mimeType: string | null;
  filePath: string | null;
};

const SELECT =
  "id, student_id, from_date, to_date, reason, comment, status, created_at, submitted_by, submitted_by_name, reviewed_at, reviewed_by_name, review_note, mime_type, file_path";

type Row = {
  id: string;
  student_id: string;
  from_date: string;
  to_date: string;
  reason: JustificationReason;
  comment: string | null;
  status: JustificationStatus;
  created_at: string;
  submitted_by: string | null;
  submitted_by_name: string;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
  review_note: string | null;
  mime_type: string | null;
  file_path: string | null;
};

const toJustification = (row: Row): Justification => ({
  id: row.id,
  studentId: row.student_id,
  from: row.from_date,
  to: row.to_date,
  reason: row.reason,
  comment: row.comment,
  status: row.status,
  createdAt: new Date(row.created_at).toISOString(),
  submittedBy: row.submitted_by,
  submittedByName: row.submitted_by_name,
  reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
  reviewedByName: row.reviewed_by_name,
  reviewNote: row.review_note,
  mimeType: row.mime_type,
  filePath: row.file_path,
});

/** Liens temporaires (1 h) vers les photos, dans l'ordre des chemins donnés. */
async function signedUrls(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const supabase = await createClient();
  const { data } = await supabase.storage.from(JUSTIFICATION_BUCKET).createSignedUrls(paths, 3600);
  for (const item of data ?? []) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  return urls;
}

/** Justificatifs d'élèves dont la période se termine après `since` (parent, fiche élève : la RLS filtre). */
export async function listStudentJustifications(
  studentIds: string[],
  since: string,
): Promise<(Justification & { fileUrl: string | null })[]> {
  if (studentIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("absence_justifications")
    .select(SELECT)
    .in("student_id", studentIds)
    .gte("to_date", since)
    .order("from_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const rows = (data ?? []).map(toJustification);
  const urls = await signedUrls(rows.flatMap((row) => (row.filePath ? [row.filePath] : [])));
  return rows.map((row) => ({ ...row, fileUrl: row.filePath ? (urls.get(row.filePath) ?? null) : null }));
}

export type ReviewItem = Justification & {
  studentName: string;
  className: string | null;
  fileUrl: string | null;
  /** Demi-journées d'absence relevées par l'appel sur la période. */
  absences: number;
};

export type ReviewFilter = "pending" | "reviewed";

/**
 * Justificatifs à traiter (les plus anciens d'abord) ou déjà traités (les plus récents d'abord),
 * avec l'élève, sa classe, la photo et les absences relevées sur la période.
 */
export async function listJustificationsForReview(schoolId: string, filter: ReviewFilter): Promise<ReviewItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("absence_justifications")
    .select(
      `${SELECT}, student:students(first_name, last_name, enrollments(status, class:classes!enrollments_class_id_school_id_fkey(name, year:academic_years(is_current))))`,
    )
    .eq("school_id", schoolId);
  query =
    filter === "pending"
      ? query.eq("status", "pending").order("created_at", { ascending: true })
      : query.neq("status", "pending").order("reviewed_at", { ascending: false });
  const { data, error } = await query.limit(50);
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const from = rows.reduce((min, row) => (row.from_date < min ? row.from_date : min), rows[0]!.from_date);
  const to = rows.reduce((max, row) => (row.to_date > max ? row.to_date : max), rows[0]!.to_date);
  const [urls, recordsResult] = await Promise.all([
    signedUrls(rows.flatMap((row) => (row.file_path ? [row.file_path] : []))),
    supabase
      .from("attendance_records")
      .select("student_id, date")
      .eq("school_id", schoolId)
      .eq("status", "absent")
      .in("student_id", [...new Set(rows.map((row) => row.student_id))])
      .gte("date", from)
      .lte("date", to)
      .limit(1000),
  ]);
  const absences = recordsResult.data ?? [];

  return rows.map((row) => {
    const current = row.student?.enrollments.find((e) => e.status === "active" && e.class?.year?.is_current);
    return {
      ...toJustification(row),
      studentName: row.student ? `${row.student.first_name} ${row.student.last_name}` : "",
      className: current?.class?.name ?? null,
      fileUrl: row.file_path ? (urls.get(row.file_path) ?? null) : null,
      absences: absences.filter((a) => a.student_id === row.student_id && a.date >= row.from_date && a.date <= row.to_date)
        .length,
    };
  });
}

/** Nombre de justificatifs en attente de décision (pastille de l'onglet). */
export async function countPendingJustifications(schoolId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("absence_justifications")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("status", "pending");
  return count ?? 0;
}
