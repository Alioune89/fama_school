import "server-only";
import { parseSchoolSettings } from "@/lib/domain/school-settings";
import { createClient } from "@/lib/supabase/server";
import type { BuildInput, ReportCardData } from "./build";

const byName = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true });

/**
 * Tout ce qu'il faut pour calculer les bulletins d'une classe sur une période (src/features/report-cards/build.ts).
 * Null si la classe ou la période n'existe pas pour cette école.
 */
export async function loadBuildInput(schoolId: string, classId: string, periodId: string): Promise<BuildInput | null> {
  const supabase = await createClient();
  const [schoolResult, classResult, periodResult, rosterResult] = await Promise.all([
    supabase.from("schools").select("name, city, address, phone, email, settings").eq("id", schoolId).single(),
    supabase
      .from("classes")
      .select(
        "name, homeroom:school_staff(full_name), year:academic_years(label), level:levels(label, cycle:cycles(grading_scale), level_subjects(coefficient, subject:subjects(id, name, name_ar, track, position, active)))",
      )
      .eq("school_id", schoolId)
      .eq("id", classId)
      .maybeSingle(),
    supabase.from("periods").select("label, starts_on, ends_on").eq("school_id", schoolId).eq("id", periodId).maybeSingle(),
    supabase
      .from("enrollments")
      .select("student:students(id, first_name, last_name, matricule, sex, birth_date, birth_place)")
      .eq("class_id", classId)
      .eq("status", "active"),
  ]);
  if (schoolResult.error) throw schoolResult.error;
  if (classResult.error) throw classResult.error;
  if (rosterResult.error) throw rosterResult.error;
  const klass = classResult.data;
  const period = periodResult.data;
  if (!klass || !period) return null;

  const students = (rosterResult.data ?? [])
    .flatMap((e) => (e.student ? [e.student] : []))
    .sort((a, b) => byName(a.last_name, b.last_name) || byName(a.first_name, b.first_name));
  const studentIds = students.map((s) => s.id);

  const [evaluationsResult, appreciationsResult, councilResult, attendanceResult] = await Promise.all([
    supabase
      .from("evaluations")
      .select("subject_id, kind, max_score, weight, grades(student_id, status, score, acquisition)")
      .eq("class_id", classId)
      .eq("period_id", periodId)
      .limit(1000),
    supabase
      .from("subject_appreciations")
      .select("subject_id, student_id, text")
      .eq("class_id", classId)
      .eq("period_id", periodId),
    supabase
      .from("council_decisions")
      .select("student_id, sanction, withhold_mention, general_appreciation")
      .eq("class_id", classId)
      .eq("period_id", periodId),
    studentIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("attendance_records")
          .select("student_id, status")
          .in("student_id", studentIds)
          .in("status", ["absent", "late"])
          .gte("date", period.starts_on)
          .lte("date", period.ends_on)
          .limit(50000),
  ]);
  if (evaluationsResult.error) throw evaluationsResult.error;
  if (appreciationsResult.error) throw appreciationsResult.error;
  if (councilResult.error) throw councilResult.error;
  if (attendanceResult.error) throw attendanceResult.error;

  const absences = new Map<string, { absent: number; late: number }>();
  for (const record of attendanceResult.data ?? []) {
    const counts = absences.get(record.student_id) ?? { absent: 0, late: 0 };
    if (record.status === "absent") counts.absent += 1;
    else counts.late += 1;
    absences.set(record.student_id, counts);
  }

  const settings = parseSchoolSettings(schoolResult.data.settings);
  const { name, city, address, phone, email } = schoolResult.data;

  return {
    school: { name, city, address, phone, email },
    academicYear: klass.year?.label ?? "",
    periodLabel: period.label,
    className: klass.name,
    levelLabel: klass.level?.label ?? "",
    scale: klass.level?.cycle?.grading_scale ?? "twenty",
    francoArabic: settings.francoArabic,
    weights: settings.evaluationWeights,
    thresholds: settings.mentionThresholds,
    homeroomTeacher: klass.homeroom?.full_name ?? null,
    students: students.map((s) => ({
      id: s.id,
      firstName: s.first_name,
      lastName: s.last_name,
      matricule: s.matricule,
      sex: s.sex,
      birthDate: s.birth_date,
      birthPlace: s.birth_place,
    })),
    subjects: (klass.level?.level_subjects ?? [])
      .flatMap((ls) => (ls.subject?.active ? [{ ...ls.subject, coefficient: Number(ls.coefficient) }] : []))
      .sort((a, b) => a.position - b.position || byName(a.name, b.name))
      .map((s) => ({ id: s.id, name: s.name, nameAr: s.name_ar, track: s.track, coefficient: s.coefficient })),
    evaluations: (evaluationsResult.data ?? []).map((e) => ({
      subjectId: e.subject_id,
      kind: e.kind,
      maxScore: e.max_score === null ? null : Number(e.max_score),
      weight: Number(e.weight),
      grades: e.grades.map((g) => ({
        studentId: g.student_id,
        status: g.status,
        score: g.score === null ? null : Number(g.score),
        acquisition: g.acquisition,
      })),
    })),
    appreciations: new Map((appreciationsResult.data ?? []).map((a) => [`${a.subject_id}:${a.student_id}`, a.text])),
    council: new Map(
      (councilResult.data ?? []).map((d) => [
        d.student_id,
        { sanction: d.sanction, withholdMention: d.withhold_mention, appreciation: d.general_appreciation ?? "" },
      ]),
    ),
    absences,
  };
}

export type ReportCardRow = {
  id: string;
  studentId: string;
  code: string;
  generatedAt: string;
  publishedAt: string | null;
  data: ReportCardData;
};

/** Bulletins d'une classe sur une période (la RLS limite l'accès). */
export async function listClassReportCards(classId: string, periodId: string): Promise<ReportCardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_cards")
    .select("id, student_id, code, generated_at, published_at, data")
    .eq("class_id", classId)
    .eq("period_id", periodId);
  if (error) throw error;
  return (data ?? []).map(toRow);
}

/** Bulletins publiés d'un élève, du plus récent au plus ancien (vue parent). */
export async function listStudentReportCards(studentId: string): Promise<ReportCardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_cards")
    .select("id, student_id, code, generated_at, published_at, data")
    .eq("student_id", studentId)
    .not("published_at", "is", null)
    .order("generated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toRow);
}

export type ReportCardDocumentData = ReportCardRow & {
  schoolId: string;
  classId: string;
  periodId: string;
  logoUrl: string | null;
};

/** Un bulletin et le logo actuel de l'école (la RLS limite l'accès). */
export async function getReportCard(id: string): Promise<ReportCardDocumentData | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_cards")
    .select("id, student_id, school_id, class_id, period_id, code, generated_at, published_at, data")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: school } = await supabase.from("schools").select("logo_path").eq("id", data.school_id).maybeSingle();
  const logoPath = school?.logo_path;
  return {
    ...toRow(data),
    schoolId: data.school_id,
    classId: data.class_id,
    periodId: data.period_id,
    logoUrl: logoPath ? supabase.storage.from("school-logos").getPublicUrl(logoPath).data.publicUrl : null,
  };
}

function toRow(row: {
  id: string;
  student_id: string;
  code: string;
  generated_at: string;
  published_at: string | null;
  data: unknown;
}): ReportCardRow {
  return {
    id: row.id,
    studentId: row.student_id,
    code: row.code,
    generatedAt: row.generated_at,
    publishedAt: row.published_at,
    data: row.data as ReportCardData,
  };
}

/** Élèves inscrits dans la classe, par ordre alphabétique. */
export async function listClassRoster(classId: string): Promise<{ id: string; firstName: string; lastName: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrollments")
    .select("student:students(id, first_name, last_name)")
    .eq("class_id", classId)
    .eq("status", "active");
  if (error) throw error;
  return (data ?? [])
    .flatMap((e) => (e.student ? [{ id: e.student.id, firstName: e.student.first_name, lastName: e.student.last_name }] : []))
    .sort((a, b) => byName(a.lastName, b.lastName) || byName(a.firstName, b.firstName));
}

/** Téléchargement bloqué pour l'utilisateur connecté : réglage de l'école et facture en retard (parents seulement). */
export async function isReportCardDownloadBlocked(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report_card_download_blocked", { p_report_card_id: id });
  if (error) throw error;
  return data === true;
}
