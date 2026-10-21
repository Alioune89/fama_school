import "server-only";
import type { AttendanceSlot, AttendanceStatus } from "@/lib/offline/operations";
import { createClient } from "@/lib/supabase/server";
import { monthDays, shiftDay, shiftMonth, type DayMarks } from "./report";

const byName = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true });
const iso = (value: string) => new Date(value).toISOString();

async function currentYearClasses(schoolId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .select(
      "id, name, level:levels(label, position), year:academic_years!inner(is_current), enrollments!enrollments_class_id_school_id_fkey(status)",
    )
    .eq("school_id", schoolId)
    .eq("year.is_current", true);
  if (error) throw error;
  return (data ?? [])
    .map((c) => ({
      id: c.id,
      name: c.name,
      levelLabel: c.level?.label ?? "",
      position: c.level?.position ?? 0,
      studentCount: c.enrollments.filter((e) => e.status === "active").length,
    }))
    .sort((a, b) => a.position - b.position || byName(a.name, b.name));
}

export type SlotState = { takenAt: string; takenBy: string | null; absent: number; late: number } | null;

export type DailyAttendance = Awaited<ReturnType<typeof getDailyAttendance>>;

/** Présence d'une journée : appels faits par classe, absents et retards, taux de présence. */
export async function getDailyAttendance(schoolId: string, date: string) {
  const supabase = await createClient();
  const [classes, sessionsResult, recordsResult, marksResult] = await Promise.all([
    currentYearClasses(schoolId),
    supabase.from("attendance_sessions").select("class_id, slot, taken_at, taken_by").eq("school_id", schoolId).eq("date", date),
    supabase
      .from("attendance_records")
      .select("student_id, class_id, status, session:attendance_sessions(slot), student:students(first_name, last_name)")
      .eq("school_id", schoolId)
      .eq("date", date)
      .neq("status", "present"),
    supabase
      .from("attendance_records")
      .select("student_id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("date", date),
  ]);
  if (sessionsResult.error) throw sessionsResult.error;
  if (recordsResult.error) throw recordsResult.error;

  const sessions = sessionsResult.data ?? [];
  const records = recordsResult.data ?? [];

  // Nom de la personne qui a fait l'appel (enseignant, surveillant…).
  const takerIds = [...new Set(sessions.map((s) => s.taken_by).filter((id): id is string => Boolean(id)))];
  const { data: takers } = takerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", takerIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const takerName = new Map((takers ?? []).map((p) => [p.id, p.full_name]));

  const slots = new Map<string, Record<AttendanceSlot, SlotState>>();
  for (const session of sessions) {
    const entry = slots.get(session.class_id) ?? { morning: null, afternoon: null };
    entry[session.slot] = {
      takenAt: iso(session.taken_at),
      takenBy: session.taken_by ? (takerName.get(session.taken_by) ?? null) : null,
      absent: 0,
      late: 0,
    };
    slots.set(session.class_id, entry);
  }

  const className = new Map(classes.map((c) => [c.id, c.name]));
  const classPosition = new Map(classes.map((c, index) => [c.id, index]));
  const students = new Map<
    string,
    { id: string; firstName: string; lastName: string; classId: string; className: string; marks: DayMarks }
  >();
  for (const record of records) {
    const slot = record.session?.slot;
    if (!slot) continue;
    const state = slots.get(record.class_id)?.[slot];
    if (state) state[record.status === "absent" ? "absent" : "late"] += 1;
    const entry = students.get(record.student_id) ?? {
      id: record.student_id,
      firstName: record.student?.first_name ?? "",
      lastName: record.student?.last_name ?? "",
      classId: record.class_id,
      className: className.get(record.class_id) ?? "",
      marks: {},
    };
    entry.marks[slot] = record.status;
    students.set(record.student_id, entry);
  }

  const absentMarks = records.filter((r) => r.status === "absent").length;
  const list = [...students.values()].sort(
    (a, b) =>
      (classPosition.get(a.classId) ?? 0) - (classPosition.get(b.classId) ?? 0) ||
      byName(a.lastName, b.lastName) ||
      byName(a.firstName, b.firstName),
  );

  return {
    classes: classes.map((c) => ({ ...c, slots: slots.get(c.id) ?? { morning: null, afternoon: null } })),
    students: list,
    totals: {
      classCount: classes.length,
      classesWithoutRollCall: classes.filter((c) => !slots.has(c.id)).length,
      marks: marksResult.count ?? 0,
      absentMarks,
      absentStudents: list.filter((s) => Object.values(s.marks).includes("absent")).length,
      lateStudents: list.filter((s) => Object.values(s.marks).includes("late")).length,
    },
  };
}

/** Seuil d'alerte : demi-journées d'absence sur les 30 derniers jours. */
export const REPEATED_ABSENCE_THRESHOLD = 3;
export const REPEATED_ABSENCE_WINDOW_DAYS = 30;

/** Élèves absents de façon répétée sur les 30 derniers jours, avec le contact principal de la famille. */
export async function getRepeatedAbsences(schoolId: string, today: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("attendance_absence_summary", {
      p_school_id: schoolId,
      p_from: shiftDay(today, -(REPEATED_ABSENCE_WINDOW_DAYS - 1)),
      p_to: today,
    })
    .gte("absences", REPEATED_ABSENCE_THRESHOLD)
    .order("absences", { ascending: false })
    .order("last_absence", { ascending: false })
    .limit(30);
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const { data: links } = await supabase
    .from("student_guardians")
    .select("student_id, is_primary, guardian:guardians(full_name, phone)")
    .in(
      "student_id",
      rows.map((row) => row.student_id),
    );
  const contact = new Map<string, { name: string; phone: string | null }>();
  for (const link of links ?? []) {
    if (!link.guardian || (contact.has(link.student_id) && !link.is_primary)) continue;
    contact.set(link.student_id, { name: link.guardian.full_name, phone: link.guardian.phone });
  }

  return rows.map((row) => ({
    studentId: row.student_id,
    name: `${row.first_name} ${row.last_name}`,
    className: row.class_name,
    absences: row.absences,
    lates: row.lates,
    lastAbsence: row.last_absence,
    guardian: contact.get(row.student_id) ?? null,
  }));
}

export type MonthGrid = NonNullable<Awaited<ReturnType<typeof getMonthGrid>>>;

/** Grille d'une classe sur un mois : élèves en lignes, jours de classe en colonnes. */
export async function getMonthGrid(schoolId: string, classId: string, month: string, today: string) {
  const supabase = await createClient();
  const from = `${month}-01`;
  const to = shiftDay(`${shiftMonth(month, 1)}-01`, -1);
  const [rosterResult, sessionsResult, recordsResult] = await Promise.all([
    supabase
      .from("enrollments")
      .select("student:students(id, first_name, last_name)")
      .eq("school_id", schoolId)
      .eq("class_id", classId)
      .eq("status", "active"),
    supabase
      .from("attendance_sessions")
      .select("date, slot")
      .eq("school_id", schoolId)
      .eq("class_id", classId)
      .gte("date", from)
      .lte("date", to),
    supabase
      .from("attendance_records")
      .select("student_id, date, status, session:attendance_sessions(slot)")
      .eq("school_id", schoolId)
      .eq("class_id", classId)
      .gte("date", from)
      .lte("date", to)
      .neq("status", "present"),
  ]);
  if (rosterResult.error) throw rosterResult.error;

  const sessions = sessionsResult.data ?? [];
  const days = monthDays(month, today, new Set(sessions.map((s) => s.date)));
  const exceptions = new Map<string, AttendanceStatus>();
  for (const record of recordsResult.data ?? []) {
    if (record.session) exceptions.set(`${record.student_id}:${record.date}:${record.session.slot}`, record.status);
  }

  const students = (rosterResult.data ?? [])
    .flatMap((e) => (e.student ? [e.student] : []))
    .sort((a, b) => byName(a.last_name, b.last_name) || byName(a.first_name, b.first_name))
    .map((student) => {
      const marks: Record<string, DayMarks> = {};
      let absences = 0;
      let lates = 0;
      for (const session of sessions) {
        const status = exceptions.get(`${student.id}:${session.date}:${session.slot}`) ?? "present";
        (marks[session.date] ??= {})[session.slot] = status;
        if (status === "absent") absences += 1;
        if (status === "late") lates += 1;
      }
      return { id: student.id, firstName: student.first_name, lastName: student.last_name, marks, absences, lates };
    });

  return { days, students, sessionCount: sessions.length };
}

/** Classes de l'année en cours, pour le choix de la grille. */
export async function listAttendanceClasses(schoolId: string) {
  return (await currentYearClasses(schoolId)).map(({ id, name }) => ({ id, name }));
}

export type RollCallLogEntry = Awaited<ReturnType<typeof getRollCallLog>>[number];

/** Journal des appels d'une journée : chaque envoi, son auteur, ses heures et les élèves concernés. */
export async function getRollCallLog(schoolId: string, date: string, classId: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("attendance_submissions")
    .select(
      "id, class_id, slot, submitted_by, taken_at, received_at, outcome, is_first, absent_count, late_count, class:classes(name), changes:attendance_changes(student_id, previous_status, new_status, student:students(first_name, last_name))",
    )
    .eq("school_id", schoolId)
    .eq("date", date)
    .order("received_at", { ascending: false })
    .limit(200);
  if (classId) query = query.eq("class_id", classId);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];

  const authorIds = [...new Set(rows.map((r) => r.submitted_by).filter((id): id is string => Boolean(id)))];
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const authorName = new Map((authors ?? []).map((p) => [p.id, p.full_name]));

  return rows.map((row) => ({
    id: row.id,
    className: row.class?.name ?? "",
    slot: row.slot,
    author: row.submitted_by ? (authorName.get(row.submitted_by) ?? null) : null,
    takenAt: iso(row.taken_at),
    receivedAt: iso(row.received_at),
    outcome: row.outcome as "applied" | "stale",
    isFirst: row.is_first,
    absent: row.absent_count,
    late: row.late_count,
    changes: row.changes
      .map((change) => ({
        studentId: change.student_id,
        name: change.student ? `${change.student.first_name} ${change.student.last_name}` : "",
        lastName: change.student?.last_name ?? "",
        previous: change.previous_status,
        next: change.new_status,
      }))
      .sort((a, b) => byName(a.lastName, b.lastName)),
  }));
}
