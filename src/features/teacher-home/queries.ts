import "server-only";
import { listPeriods, listTeacherGradebooks, pickPeriod } from "@/features/evaluations/queries";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type TeacherEvaluation = {
  id: string;
  title: string;
  kind: Enums<"evaluation_kind">;
  heldOn: string;
  className: string;
  subjectName: string;
  graded: number;
  students: number;
  published: boolean;
};

const DAY = 24 * 60 * 60 * 1000;
const shift = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);

/**
 * Évaluations du professeur sur la période en cours : celles déjà passées dont les notes restent à saisir ou à
 * publier, et celles des deux semaines à venir.
 */
export async function getTeacherEvaluations(
  schoolId: string,
  userId: string,
  today: string,
): Promise<{ toFinish: TeacherEvaluation[]; upcoming: TeacherEvaluation[] }> {
  const [gradebooks, periods] = await Promise.all([listTeacherGradebooks(schoolId, userId), listPeriods(schoolId)]);
  const period = pickPeriod(periods, today);
  if (!period || gradebooks.length === 0) return { toFinish: [], upcoming: [] };

  const pairs = new Map<string, { className: string; subjectName: string }>();
  for (const book of gradebooks) {
    for (const subject of book.subjects)
      pairs.set(`${book.id}:${subject.id}`, { className: book.name, subjectName: subject.name });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluations")
    .select(
      "id, class_id, subject_id, kind, title, held_on, published_at, grades(count), class:classes!evaluations_class_id_school_id_fkey(enrollments!enrollments_class_id_school_id_fkey(status))",
    )
    .eq("school_id", schoolId)
    .eq("period_id", period.id)
    .in(
      "class_id",
      gradebooks.map((book) => book.id),
    )
    .lte("held_on", shift(today, 14))
    .order("held_on")
    .limit(500);
  if (error) throw error;

  const rows = (data ?? []).flatMap((row) => {
    const pair = pairs.get(`${row.class_id}:${row.subject_id}`);
    if (!pair) return [];
    return [
      {
        id: row.id,
        title: row.title,
        kind: row.kind,
        heldOn: row.held_on,
        ...pair,
        graded: row.grades[0]?.count ?? 0,
        students: row.class?.enrollments.filter((e) => e.status === "active").length ?? 0,
        published: row.published_at !== null,
      },
    ];
  });
  return {
    toFinish: rows.filter((row) => row.heldOn <= today && !row.published).reverse(),
    upcoming: rows.filter((row) => row.heldOn > today),
  };
}
