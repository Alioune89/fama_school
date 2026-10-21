import "server-only";
import { hasClassTeacher } from "@/lib/domain/teaching";
import { sanitizeSearch } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

export type StaffListFilters = {
  q?: string;
  contract?: Enums<"staff_contract"> | null;
  cycle?: Enums<"cycle_code"> | null;
};

async function currentYearId(schoolId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("academic_years")
    .select("id, label")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();
  return data;
}

/** Cycles ouverts par l'école (choix du cycle d'un enseignant, filtre de la liste). */
export async function listSchoolCycles(schoolId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("cycles").select("code, label").eq("school_id", schoolId).order("position");
  return data ?? [];
}

export type SchoolCycle = Awaited<ReturnType<typeof listSchoolCycles>>[number];

/**
 * Enseignants de l'école avec leurs classes de l'année en cours. Le titulaire d'une classe
 * du préscolaire ou de l'élémentaire y enseigne toutes les matières (sauf celles confiées à un autre).
 */
export async function listTeachers(schoolId: string, filters: StaffListFilters = {}) {
  const supabase = await createClient();
  const year = await currentYearId(schoolId);
  let query = supabase
    .from("school_staff")
    .select(
      "id, full_name, phone, email, title, contract, sex, cycle, status, user_id, teaching_assignments(id, subject:subjects(name, short_name), class:classes(id, name, academic_year_id)), homeroom:classes!classes_homeroom_staff_id_school_id_fkey(name, academic_year_id, level:levels(cycle:cycles(code)))",
    )
    .eq("school_id", schoolId)
    .eq("role", "teacher")
    .order("status")
    .order("full_name");

  const q = sanitizeSearch(filters.q);
  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q.replace(/\s/g, "")}%`);
  if (filters.contract) query = query.eq("contract", filters.contract);
  if (filters.cycle) query = query.eq("cycle", filters.cycle);

  const { data, error } = await query;
  if (error) throw error;

  const inYear = (yearId: string) => !year || yearId === year.id;
  return (data ?? []).map(({ teaching_assignments, homeroom, ...teacher }) => {
    const assignments = teaching_assignments.filter((a) => a.class && inYear(a.class.academic_year_id));
    const titular = homeroom.filter((c) => inYear(c.academic_year_id) && hasClassTeacher(c.level?.cycle?.code));
    return {
      ...teacher,
      /** Classes dont l'enseignant est titulaire (toutes les matières). */
      titularOf: titular.map((c) => c.name),
      subjects: [...new Set(assignments.map((a) => a.subject?.name).filter((name): name is string => Boolean(name)))],
      classes: [...new Set([...titular.map((c) => c.name), ...assignments.map((a) => a.class!.name)])].sort((a, b) =>
        a.localeCompare(b, "fr", { numeric: true }),
      ),
    };
  });
}

/** Personnel administratif (direction, censeur, surveillant, comptable, secrétaire). */
export async function listStaff(schoolId: string, filters: StaffListFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("school_staff")
    .select("id, full_name, phone, email, role, title, status, user_id")
    .eq("school_id", schoolId)
    .neq("role", "teacher")
    .order("status")
    .order("full_name");
  const q = sanitizeSearch(filters.q);
  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q.replace(/\s/g, "")}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Fiche d'un membre du personnel avec ses affectations et les options d'affectation. */
export async function getStaffMember(schoolId: string, staffId: string) {
  const supabase = await createClient();
  const year = await currentYearId(schoolId);

  const { data: member } = await supabase
    .from("school_staff")
    .select("id, full_name, phone, email, role, title, contract, sex, cycle, status, user_id, created_at")
    .eq("school_id", schoolId)
    .eq("id", staffId)
    .maybeSingle();
  if (!member) return null;

  const [assignmentsResult, classesResult, levelSubjectsResult, takenResult] = await Promise.all([
    supabase
      .from("teaching_assignments")
      .select("id, class:classes!inner(id, name, academic_year_id, level_id), subject:subjects(id, name)")
      .eq("staff_id", staffId),
    year
      ? supabase.from("classes").select("id, name, level_id, homeroom_staff_id").eq("academic_year_id", year.id).order("name")
      : Promise.resolve({ data: [] as { id: string; name: string; level_id: string; homeroom_staff_id: string | null }[] }),
    supabase.from("level_subjects").select("level_id, subject:subjects(id, name, active)").eq("school_id", schoolId),
    supabase.from("teaching_assignments").select("class_id, subject_id, staff:school_staff(full_name)").eq("school_id", schoolId),
  ]);

  const classes = classesResult.data ?? [];
  const assignments = (assignmentsResult.data ?? [])
    .filter((a) => !year || a.class.academic_year_id === year.id)
    .map((a) => ({
      id: a.id,
      classId: a.class.id,
      className: a.class.name,
      subjectId: a.subject?.id ?? "",
      subjectName: a.subject?.name ?? "",
    }))
    .sort(
      (a, b) =>
        a.className.localeCompare(b.className, "fr", { numeric: true }) || a.subjectName.localeCompare(b.subjectName, "fr"),
    );

  const subjectsByLevel = new Map<string, { id: string; name: string }[]>();
  for (const row of levelSubjectsResult.data ?? []) {
    if (!row.subject || row.subject.active === false) continue;
    const list = subjectsByLevel.get(row.level_id) ?? [];
    list.push({ id: row.subject.id, name: row.subject.name });
    subjectsByLevel.set(row.level_id, list);
  }
  const takenBy = new Map(
    (takenResult.data ?? []).map((row) => [`${row.class_id}:${row.subject_id}`, row.staff?.full_name ?? ""]),
  );

  return {
    member,
    yearLabel: year?.label ?? null,
    assignments,
    homeroomClasses: classes.filter((c) => c.homeroom_staff_id === staffId).map((c) => ({ id: c.id, name: c.name })),
    options: classes.map((c) => ({
      id: c.id,
      name: c.name,
      homeroomStaffId: c.homeroom_staff_id,
      subjects: (subjectsByLevel.get(c.level_id) ?? [])
        .sort((a, b) => a.name.localeCompare(b.name, "fr"))
        .map((subject) => ({ ...subject, takenBy: takenBy.get(`${c.id}:${subject.id}`) ?? null })),
    })),
  };
}

export type StaffMemberDetail = NonNullable<Awaited<ReturnType<typeof getStaffMember>>>;
