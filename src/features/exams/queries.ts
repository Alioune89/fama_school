import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";
import { EXAMS, type Exam } from "./schemas";

export type ExamCandidateRow = {
  studentId: string;
  firstName: string;
  lastName: string;
  matricule: string;
  sex: "F" | "M";
  birthDate: string | null;
  birthPlace: string | null;
  className: string;
  series: string | null;
  /** Moyenne générale des bulletins de l'année (moyenne des périodes), au barème du cycle. */
  average: number | null;
  tableNumber: string;
  center: string;
  result: Enums<"exam_result">;
  mention: Enums<"exam_mention"> | null;
};

/** Examens préparés dans l'école cette année : ceux des niveaux qui ont au moins une classe. */
export async function listSchoolExams(schoolId: string): Promise<Exam[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("level:levels!inner(exam), year:academic_years!inner(is_current)")
    .eq("school_id", schoolId)
    .eq("year.is_current", true)
    .not("level.exam", "is", null);
  if (error) throw error;
  const present = new Set(data.map((row) => row.level.exam));
  return EXAMS.filter((exam) => present.has(exam));
}

/** Candidats d'un examen : élèves inscrits dans une classe du niveau d'examen, avec leur convocation et leur résultat. */
export async function listExamCandidates(schoolId: string, exam: Exam) {
  const supabase = await createClient();
  const { data: year, error: yearError } = await supabase
    .from("academic_years")
    .select("id, label")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();
  if (yearError) throw yearError;
  if (!year) return { yearLabel: null, rows: [] as ExamCandidateRow[] };

  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, name, level:levels!inner(exam, series)")
    .eq("school_id", schoolId)
    .eq("academic_year_id", year.id)
    .eq("level.exam", exam);
  if (classesError) throw classesError;
  const classById = new Map(classes.map((c) => [c.id, c]));
  if (classById.size === 0) return { yearLabel: year.label, rows: [] };

  const classIds = [...classById.keys()];
  const [enrollments, candidates, cards] = await Promise.all([
    supabase
      .from("enrollments")
      .select("class_id, student:students(id, first_name, last_name, matricule, sex, birth_date, birth_place)")
      .eq("school_id", schoolId)
      .eq("academic_year_id", year.id)
      .eq("status", "active")
      .in("class_id", classIds),
    supabase
      .from("exam_candidates")
      .select("student_id, table_number, center, result, mention")
      .eq("school_id", schoolId)
      .eq("academic_year_id", year.id)
      .eq("exam", exam),
    supabase.from("report_cards").select("student_id, general:data->general").eq("school_id", schoolId).in("class_id", classIds),
  ]);
  if (enrollments.error) throw enrollments.error;
  if (candidates.error) throw candidates.error;
  if (cards.error) throw cards.error;

  const candidateByStudent = new Map(candidates.data.map((row) => [row.student_id, row]));
  const generals = new Map<string, number[]>();
  for (const card of cards.data) {
    if (typeof card.general !== "number") continue;
    generals.set(card.student_id, [...(generals.get(card.student_id) ?? []), card.general]);
  }

  const rows: ExamCandidateRow[] = enrollments.data
    .filter((row) => row.student)
    .map(({ class_id, student }) => {
      const klass = classById.get(class_id)!;
      const candidate = candidateByStudent.get(student!.id);
      const averages = generals.get(student!.id);
      return {
        studentId: student!.id,
        firstName: student!.first_name,
        lastName: student!.last_name,
        matricule: student!.matricule,
        sex: student!.sex,
        birthDate: student!.birth_date,
        birthPlace: student!.birth_place,
        className: klass.name,
        series: klass.level.series,
        average: averages?.length
          ? Math.round((averages.reduce((sum, value) => sum + value, 0) / averages.length) * 100) / 100
          : null,
        tableNumber: candidate?.table_number ?? "",
        center: candidate?.center ?? "",
        result: candidate?.result ?? "pending",
        mention: candidate?.mention ?? null,
      };
    })
    .sort(
      (a, b) =>
        a.className.localeCompare(b.className, "fr") ||
        a.lastName.localeCompare(b.lastName, "fr") ||
        a.firstName.localeCompare(b.firstName, "fr"),
    );
  return { yearLabel: year.label, rows };
}

/** Examens d'un élève, pour l'espace parents (convocation puis résultat). */
export async function listStudentExams(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_candidates")
    .select("id, exam, table_number, center, result, mention, year:academic_years(label, is_current)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data
    .filter((row) => row.year?.is_current || row.result !== "pending")
    .map((row) => ({
      id: row.id,
      exam: row.exam as Exam,
      yearLabel: row.year?.label ?? "",
      tableNumber: row.table_number,
      center: row.center,
      result: row.result,
      mention: row.mention,
    }));
}
