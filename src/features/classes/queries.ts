import "server-only";
import { hasClassTeacher } from "@/lib/domain/teaching";
import { createClient } from "@/lib/supabase/server";

const byName = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true });

async function currentYear(schoolId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("academic_years")
    .select("id, label")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();
  return data;
}

/** Classes de l'année en cours, regroupées par cycle : effectif (filles/garçons), professeur principal, matières couvertes. */
export async function listClasses(schoolId: string) {
  const year = await currentYear(schoolId);
  if (!year) return { yearLabel: null, cycles: [], total: 0 };

  const supabase = await createClient();
  const [classesResult, levelSubjectsResult] = await Promise.all([
    supabase
      .from("classes")
      .select(
        "id, name, room, capacity, level_id, homeroom:school_staff(full_name), level:levels(label, position, cycle:cycles(id, code, label, position)), enrollments!enrollments_class_id_school_id_fkey(status, student:students(sex)), teaching_assignments(subject_id)",
      )
      .eq("school_id", schoolId)
      .eq("academic_year_id", year.id),
    supabase.from("level_subjects").select("level_id, subject:subjects(active)").eq("school_id", schoolId),
  ]);
  if (classesResult.error) throw classesResult.error;

  const subjectCount = new Map<string, number>();
  for (const row of levelSubjectsResult.data ?? []) {
    if (row.subject?.active === false) continue;
    subjectCount.set(row.level_id, (subjectCount.get(row.level_id) ?? 0) + 1);
  }

  const classes = (classesResult.data ?? [])
    .map((c) => {
      const active = c.enrollments.filter((e) => e.status === "active");
      return {
        id: c.id,
        name: c.name,
        room: c.room,
        capacity: c.capacity,
        levelLabel: c.level?.label ?? "",
        position: c.level?.position ?? 0,
        cycle: c.level?.cycle ?? null,
        homeroomName: c.homeroom?.full_name ?? null,
        hasClassTeacher: hasClassTeacher(c.level?.cycle?.code),
        count: active.length,
        girls: active.filter((e) => e.student?.sex === "F").length,
        boys: active.filter((e) => e.student?.sex === "M").length,
        subjects: subjectCount.get(c.level_id) ?? 0,
        // Au préscolaire et à l'élémentaire, le titulaire couvre toutes les matières.
        assigned:
          hasClassTeacher(c.level?.cycle?.code) && c.homeroom
            ? (subjectCount.get(c.level_id) ?? 0)
            : new Set(c.teaching_assignments.map((a) => a.subject_id)).size,
      };
    })
    .sort((a, b) => a.position - b.position || byName(a.name, b.name));

  const cycles: { id: string; label: string; position: number; classes: typeof classes }[] = [];
  for (const item of classes) {
    const key = item.cycle?.id ?? "";
    let group = cycles.find((cycle) => cycle.id === key);
    if (!group) {
      group = { id: key, label: item.cycle?.label ?? "", position: item.cycle?.position ?? 0, classes: [] };
      cycles.push(group);
    }
    group.classes.push(item);
  }
  cycles.sort((a, b) => a.position - b.position);

  return { yearLabel: year.label, cycles, total: classes.length };
}

export type ClassSummary = Awaited<ReturnType<typeof listClasses>>["cycles"][number]["classes"][number];

/** Fiche d'une classe : élèves inscrits, matières du niveau et leurs professeurs. */
export async function getClass(schoolId: string, classId: string) {
  const supabase = await createClient();
  const { data: klass } = await supabase
    .from("classes")
    .select(
      "id, name, room, capacity, homeroom_staff_id, level_id, homeroom:school_staff(full_name), year:academic_years(label, is_current), level:levels(label, cycle:cycles(code, label))",
    )
    .eq("school_id", schoolId)
    .eq("id", classId)
    .maybeSingle();
  if (!klass) return null;

  const [enrollmentsResult, levelSubjectsResult, assignmentsResult, teachersResult] = await Promise.all([
    supabase
      .from("enrollments")
      .select(
        "student:students(id, matricule, first_name, last_name, sex, birth_date, student_guardians(is_primary, guardian:guardians(full_name, phone)))",
      )
      .eq("school_id", schoolId)
      .eq("class_id", classId)
      .eq("status", "active"),
    supabase
      .from("level_subjects")
      .select("coefficient, weekly_hours, subject:subjects(id, name, position, active)")
      .eq("school_id", schoolId)
      .eq("level_id", klass.level_id),
    supabase.from("teaching_assignments").select("id, subject_id, staff:school_staff(id, full_name)").eq("class_id", classId),
    supabase
      .from("school_staff")
      .select("id, full_name")
      .eq("school_id", schoolId)
      .eq("role", "teacher")
      .eq("status", "active")
      .order("full_name"),
  ]);

  const students = (enrollmentsResult.data ?? [])
    .flatMap((e) => (e.student ? [e.student] : []))
    .map((student) => {
      const primary = student.student_guardians.find((link) => link.is_primary) ?? student.student_guardians[0];
      return {
        id: student.id,
        matricule: student.matricule,
        fullName: `${student.first_name} ${student.last_name}`,
        lastName: student.last_name,
        firstName: student.first_name,
        sex: student.sex,
        birthDate: student.birth_date,
        guardianName: primary?.guardian?.full_name ?? null,
        guardianPhone: primary?.guardian?.phone ?? null,
      };
    })
    .sort((a, b) => byName(a.lastName, b.lastName) || byName(a.firstName, b.firstName));

  const assignmentBySubject = new Map((assignmentsResult.data ?? []).map((a) => [a.subject_id, a]));
  const subjects = (levelSubjectsResult.data ?? [])
    .filter((row) => row.subject && row.subject.active !== false)
    .map((row) => {
      const assignment = assignmentBySubject.get(row.subject!.id);
      return {
        id: row.subject!.id,
        name: row.subject!.name,
        position: row.subject!.position,
        coefficient: Number(row.coefficient),
        weeklyHours: row.weekly_hours === null ? null : Number(row.weekly_hours),
        assignmentId: assignment?.id ?? null,
        teacherId: assignment?.staff?.id ?? null,
        teacherName: assignment?.staff?.full_name ?? null,
      };
    })
    .sort((a, b) => a.position - b.position || byName(a.name, b.name));

  return {
    klass: {
      id: klass.id,
      name: klass.name,
      room: klass.room,
      capacity: klass.capacity,
      homeroomStaffId: klass.homeroom_staff_id,
      homeroomName: klass.homeroom?.full_name ?? null,
      levelLabel: klass.level?.label ?? "",
      cycleLabel: klass.level?.cycle?.label ?? "",
      hasClassTeacher: hasClassTeacher(klass.level?.cycle?.code),
      yearLabel: klass.year?.label ?? "",
      isCurrent: klass.year?.is_current ?? false,
    },
    students,
    girls: students.filter((s) => s.sex === "F").length,
    boys: students.filter((s) => s.sex === "M").length,
    subjects,
    teachers: teachersResult.data ?? [],
  };
}

export type ClassDetail = NonNullable<Awaited<ReturnType<typeof getClass>>>;
