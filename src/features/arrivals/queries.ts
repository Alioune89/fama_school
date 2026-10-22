import "server-only";
import { createClient } from "@/lib/supabase/server";

const byName = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true });

export type Badge = {
  studentId: string;
  token: string;
  firstName: string;
  lastName: string;
  matricule: string | null;
  classId: string;
  className: string;
};

/** Cartes des élèves inscrits cette année, par classe puis par nom (un seul appel : les élèves sont imbriqués). */
export async function listBadges(schoolId: string, classId?: string): Promise<Badge[]> {
  const supabase = await createClient();
  let query = supabase
    .from("classes")
    .select(
      "id, name, level:levels(position), year:academic_years!inner(is_current), enrollments!enrollments_class_id_school_id_fkey(status, student:students(id, first_name, last_name, matricule, badge_token))",
    )
    .eq("school_id", schoolId)
    .eq("year.is_current", true);
  if (classId) query = query.eq("id", classId);
  const { data, error } = await query;
  if (error) throw error;

  return (data ?? [])
    .sort((a, b) => (a.level?.position ?? 0) - (b.level?.position ?? 0) || byName(a.name, b.name))
    .flatMap((klass) =>
      klass.enrollments
        .filter((e) => e.status === "active" && e.student)
        .map((e) => ({
          studentId: e.student!.id,
          token: e.student!.badge_token,
          firstName: e.student!.first_name,
          lastName: e.student!.last_name,
          matricule: e.student!.matricule,
          classId: klass.id,
          className: klass.name,
        }))
        .sort((a, b) => byName(a.lastName, b.lastName) || byName(a.firstName, b.firstName)),
    );
}

/** Heure de passage (arrivée ou sortie) de chaque élève pointé ce jour-là (la RLS limite aux élèves visibles). */
async function listCheckIns(
  table: "student_arrivals" | "student_departures",
  filter: { schoolId: string } | { studentIds: string[] },
  date: string,
) {
  const times = new Map<string, string>();
  if ("studentIds" in filter && filter.studentIds.length === 0) return times;
  const supabase = await createClient();
  let query = supabase.from(table).select("student_id, scanned_at").eq("date", date).limit(5000);
  query = "schoolId" in filter ? query.eq("school_id", filter.schoolId) : query.in("student_id", filter.studentIds);
  const { data, error } = await query;
  if (error) throw error;
  for (const row of data ?? []) times.set(row.student_id, new Date(row.scanned_at).toISOString());
  return times;
}

export const listArrivals = (filter: { schoolId: string } | { studentIds: string[] }, date: string) =>
  listCheckIns("student_arrivals", filter, date);

export const listDepartures = (filter: { schoolId: string } | { studentIds: string[] }, date: string) =>
  listCheckIns("student_departures", filter, date);
