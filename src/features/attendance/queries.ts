import "server-only";
import { cache } from "react";
import type { AttendanceSlot } from "@/lib/offline/operations";
import { createClient } from "@/lib/supabase/server";
import type { Marks, RosterStudent, ServerRollCall } from "./roll-call";

const byName = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true });
/** Format unique des heures (les dates Postgres et celles du téléphone se comparent comme des textes). */
const iso = (value: string) => new Date(value).toISOString();

export type SlotSummary = { takenAt: string; absent: number; late: number } | null;

export type TeacherClass = {
  id: string;
  name: string;
  levelLabel: string;
  studentCount: number;
  isHomeroom: boolean;
  subjects: string[];
  slots: Record<AttendanceSlot, SlotSummary>;
};

/** Classes de l'année en cours où l'utilisateur enseigne ou est professeur principal. */
const teacherClassIds = cache(async (schoolId: string, userId: string) => {
  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("school_staff")
    .select("id")
    .eq("school_id", schoolId)
    .eq("user_id", userId)
    .eq("status", "active");
  const staffIds = (staff ?? []).map((s) => s.id);
  if (staffIds.length === 0) return { subjects: new Map<string, string[]>(), homeroom: new Set<string>() };

  const [assignments, homerooms] = await Promise.all([
    supabase.from("teaching_assignments").select("class_id, subject:subjects(name)").in("staff_id", staffIds),
    supabase.from("classes").select("id").eq("school_id", schoolId).in("homeroom_staff_id", staffIds),
  ]);
  const subjects = new Map<string, string[]>();
  for (const row of assignments.data ?? []) {
    subjects.set(row.class_id, [...(subjects.get(row.class_id) ?? []), ...(row.subject ? [row.subject.name] : [])]);
  }
  const homeroom = new Set((homerooms.data ?? []).map((c) => c.id));
  for (const id of homeroom) if (!subjects.has(id)) subjects.set(id, []);
  return { subjects, homeroom };
});

/** Classes du professeur et état des appels du jour (matin et après-midi). */
export async function listTeacherClasses(schoolId: string, userId: string, date: string): Promise<TeacherClass[]> {
  const { subjects, homeroom } = await teacherClassIds(schoolId, userId);
  const ids = [...subjects.keys()];
  if (ids.length === 0) return [];

  const supabase = await createClient();
  const [classesResult, sessionsResult] = await Promise.all([
    supabase
      .from("classes")
      .select(
        "id, name, level:levels(label, position), year:academic_years!inner(is_current), enrollments!enrollments_class_id_school_id_fkey(status)",
      )
      .in("id", ids)
      .eq("year.is_current", true),
    supabase
      .from("attendance_sessions")
      .select("class_id, slot, taken_at, records:attendance_records(status)")
      .in("class_id", ids)
      .eq("date", date)
      .neq("records.status", "present"),
  ]);
  if (classesResult.error) throw classesResult.error;

  const slots = new Map<string, Record<AttendanceSlot, SlotSummary>>();
  for (const session of sessionsResult.data ?? []) {
    const entry = slots.get(session.class_id) ?? { morning: null, afternoon: null };
    entry[session.slot] = {
      takenAt: iso(session.taken_at),
      absent: session.records.filter((r) => r.status === "absent").length,
      late: session.records.filter((r) => r.status === "late").length,
    };
    slots.set(session.class_id, entry);
  }

  return (classesResult.data ?? [])
    .map((c) => ({
      position: c.level?.position ?? 0,
      item: {
        id: c.id,
        name: c.name,
        levelLabel: c.level?.label ?? "",
        studentCount: c.enrollments.filter((e) => e.status === "active").length,
        isHomeroom: homeroom.has(c.id),
        subjects: (subjects.get(c.id) ?? []).sort(byName),
        slots: slots.get(c.id) ?? { morning: null, afternoon: null },
      },
    }))
    .sort((a, b) => a.position - b.position || byName(a.item.name, b.item.name))
    .map(({ item }) => item);
}

export type RollCallData = {
  classId: string;
  className: string;
  levelLabel: string;
  date: string;
  roster: RosterStudent[];
  sessions: Partial<Record<AttendanceSlot, ServerRollCall>>;
};

/** Liste d'appel d'une classe du professeur et appels déjà enregistrés ce jour-là. Null si ce n'est pas sa classe. */
export async function getRollCall(schoolId: string, userId: string, classId: string, date: string): Promise<RollCallData | null> {
  const { subjects } = await teacherClassIds(schoolId, userId);
  if (!subjects.has(classId)) return null;
  return loadRollCall(schoolId, classId, date);
}

/**
 * Liste d'appel d'une classe de l'école, quel que soit l'enseignant (direction, surveillance).
 * Null si la classe n'appartient pas à l'année en cours de l'école.
 */
export async function loadRollCall(schoolId: string, classId: string, date: string): Promise<RollCallData | null> {
  const supabase = await createClient();
  const [classResult, rosterResult, sessionsResult] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, level:levels(label), year:academic_years!inner(is_current)")
      .eq("school_id", schoolId)
      .eq("id", classId)
      .eq("year.is_current", true)
      .maybeSingle(),
    supabase
      .from("enrollments")
      .select("student:students(id, first_name, last_name)")
      .eq("class_id", classId)
      .eq("status", "active"),
    supabase
      .from("attendance_sessions")
      .select("slot, taken_at, records:attendance_records(student_id, status)")
      .eq("class_id", classId)
      .eq("date", date),
  ]);
  if (classResult.error) throw classResult.error;
  if (!classResult.data) return null;

  const roster = (rosterResult.data ?? [])
    .flatMap((e) => (e.student ? [{ id: e.student.id, firstName: e.student.first_name, lastName: e.student.last_name }] : []))
    .sort((a, b) => byName(a.lastName, b.lastName) || byName(a.firstName, b.firstName));

  const sessions: RollCallData["sessions"] = {};
  for (const session of sessionsResult.data ?? []) {
    const marks: Marks = {};
    for (const record of session.records) marks[record.student_id] = record.status;
    sessions[session.slot] = { takenAt: iso(session.taken_at), marks };
  }

  return {
    classId,
    className: classResult.data.name,
    levelLabel: classResult.data.level?.label ?? "",
    date,
    roster,
    sessions,
  };
}
