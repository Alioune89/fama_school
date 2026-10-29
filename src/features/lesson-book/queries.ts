import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Lesson = {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  taughtOn: string;
  content: string;
  chapterTitle: string | null;
  homework: string | null;
  homeworkDueOn: string | null;
  authorName: string;
};

const SELECT =
  "id, class_id, subject_id, taught_on, content, homework, homework_due_on, author_name, class:classes!lesson_entries_class_id_school_id_fkey(name), subject:subjects!lesson_entries_subject_id_school_id_fkey(name), chapter:programme_chapters(title)";

type Row = {
  id: string;
  class_id: string;
  subject_id: string;
  taught_on: string;
  content: string;
  homework: string | null;
  homework_due_on: string | null;
  author_name: string;
  class: { name: string } | null;
  subject: { name: string } | null;
  chapter: { title: string } | null;
};

const toLesson = (row: Row): Lesson => ({
  id: row.id,
  classId: row.class_id,
  className: row.class?.name ?? "",
  subjectId: row.subject_id,
  subjectName: row.subject?.name ?? "",
  taughtOn: row.taught_on,
  content: row.content,
  chapterTitle: row.chapter?.title ?? null,
  homework: row.homework,
  homeworkDueOn: row.homework_due_on,
  authorName: row.author_name,
});

/** Cahier de textes d'une classe (d'une matière si précisée), séances les plus récentes d'abord. */
export async function listLessons(classId: string, subjectId?: string, limit = 60): Promise<Lesson[]> {
  const supabase = await createClient();
  let query = supabase
    .from("lesson_entries")
    .select(SELECT)
    .eq("class_id", classId)
    .order("taught_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (subjectId) query = query.eq("subject_id", subjectId);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as Row[]).map(toLesson);
}

/** Devoirs à rendre à partir d'une date pour quelques classes (parents : la RLS limite aux classes de leurs enfants). */
export async function listHomework(classIds: string[], from: string): Promise<Lesson[]> {
  if (classIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson_entries")
    .select(SELECT)
    .in("class_id", classIds)
    .gte("homework_due_on", from)
    .order("homework_due_on")
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as Row[]).map(toLesson);
}
