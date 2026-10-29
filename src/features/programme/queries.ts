import "server-only";
import type { ChapterStatus } from "@/lib/domain/programme";
import { createClient } from "@/lib/supabase/server";

export type Chapter = { id: string; position: number; title: string; sessions: number; targetMonth: string | null };

/** Programme d'un niveau dans une matière pour l'année en cours, dans l'ordre. */
export async function listChapters(levelId: string, subjectId: string): Promise<Chapter[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programme_chapters")
    .select("id, position, title, sessions, target_month, year:academic_years!inner(is_current)")
    .eq("level_id", levelId)
    .eq("subject_id", subjectId)
    .eq("year.is_current", true)
    .order("position")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    position: row.position,
    title: row.title,
    sessions: row.sessions,
    targetMonth: row.target_month,
  }));
}

/** Avancement d'une classe : statut de chaque chapitre commencé (les autres sont « à faire »). */
export async function getClassProgress(classId: string): Promise<Map<string, ChapterStatus>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("chapter_progress").select("chapter_id, status").eq("class_id", classId);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.chapter_id, row.status as ChapterStatus]));
}

export type ClassProgramme = {
  subjectId: string;
  subjectName: string;
  chapters: { id: string; title: string; targetMonth: string | null }[];
};

/** Programmes de toutes les matières du niveau d'une classe (vue d'ensemble : direction, parents). */
export async function listClassProgrammes(classId: string): Promise<{ levelId: string; programmes: ClassProgramme[] } | null> {
  const supabase = await createClient();
  const { data: klass, error } = await supabase.from("classes").select("level_id").eq("id", classId).maybeSingle();
  if (error) throw error;
  if (!klass) return null;
  const { data, error: chaptersError } = await supabase
    .from("programme_chapters")
    .select("id, title, target_month, subject_id, subject:subjects(name, position), year:academic_years!inner(is_current)")
    .eq("level_id", klass.level_id)
    .eq("year.is_current", true)
    .order("position")
    .order("created_at");
  if (chaptersError) throw chaptersError;
  const bySubject = new Map<string, ClassProgramme & { order: number }>();
  for (const row of data ?? []) {
    const entry = bySubject.get(row.subject_id) ?? {
      subjectId: row.subject_id,
      subjectName: row.subject?.name ?? "",
      order: row.subject?.position ?? 0,
      chapters: [],
    };
    entry.chapters.push({ id: row.id, title: row.title, targetMonth: row.target_month });
    bySubject.set(row.subject_id, entry);
  }
  return {
    levelId: klass.level_id,
    programmes: [...bySubject.values()]
      .sort((a, b) => a.order - b.order || a.subjectName.localeCompare(b.subjectName, "fr"))
      .map(({ subjectId, subjectName, chapters }) => ({ subjectId, subjectName, chapters })),
  };
}

export type PendingValidation = {
  classId: string;
  className: string;
  chapterId: string;
  chapterTitle: string;
  subjectName: string;
  doneAt: string;
};

/** Chapitres terminés en attente de validation par la direction pédagogique. */
export async function listPendingValidations(schoolId: string): Promise<PendingValidation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chapter_progress")
    .select(
      "class_id, chapter_id, updated_at, class:classes!chapter_progress_class_id_school_id_fkey(name), chapter:programme_chapters(title, subject:subjects(name))",
    )
    .eq("school_id", schoolId)
    .eq("status", "done")
    .order("updated_at")
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    classId: row.class_id,
    className: row.class?.name ?? "",
    chapterId: row.chapter_id,
    chapterTitle: row.chapter?.title ?? "",
    subjectName: row.chapter?.subject?.name ?? "",
    doneAt: row.updated_at,
  }));
}

/** Mois de l'année scolaire en cours (« 2026-10 » … « 2027-07 »), pour le mois visé des chapitres. */
export async function schoolYearMonths(schoolId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("academic_years")
    .select("starts_on, ends_on")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();
  if (!data) return [];
  const months: string[] = [];
  let [year, month] = data.starts_on.slice(0, 7).split("-").map(Number) as [number, number];
  const end = data.ends_on.slice(0, 7);
  while (months.length < 14) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    months.push(key);
    if (key >= end) break;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

/** Classe actuelle d'un élève (pour la progression vue par ses parents). */
export async function currentClassOf(studentId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select("class_id, class:classes!enrollments_class_id_school_id_fkey!inner(year:academic_years!inner(is_current))")
    .eq("student_id", studentId)
    .eq("status", "active")
    .eq("class.year.is_current", true)
    .maybeSingle();
  return data?.class_id ?? null;
}
