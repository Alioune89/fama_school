import "server-only";
import { createClient } from "@/lib/supabase/server";

export type GuardianFilter = "connected" | "notConnected" | null;

export type GuardianRow = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  connected: boolean;
  children: { id: string; name: string; className: string | null }[];
};

/** Parents de l'école avec leurs enfants (classe de l'année en cours) et leur connexion à l'application. */
export async function listGuardians(schoolId: string, { q, filter }: { q?: string; filter: GuardianFilter }) {
  const supabase = await createClient();
  let query = supabase
    .from("guardians")
    .select("id, full_name, phone, email, user_id, student_guardians(student:students(id, first_name, last_name))")
    .eq("school_id", schoolId)
    .order("full_name");
  if (filter === "connected") query = query.not("user_id", "is", null);
  if (filter === "notConnected") query = query.is("user_id", null);
  const search = q?.trim().replace(/[%,()]/g, " ");
  if (search) query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search.replace(/\s/g, "")}%`);

  const [{ data, error }, { data: year }] = await Promise.all([
    query.limit(500),
    supabase.from("academic_years").select("id").eq("school_id", schoolId).eq("is_current", true).maybeSingle(),
  ]);
  if (error) throw error;

  const studentIds = [
    ...new Set(data.flatMap((g) => g.student_guardians.map((link) => link.student?.id).filter(Boolean))),
  ] as string[];
  const classByStudent = new Map<string, string>();
  if (year && studentIds.length) {
    const { data: enrollments, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("student_id, class:classes!enrollments_class_id_school_id_fkey(name)")
      .eq("school_id", schoolId)
      .eq("academic_year_id", year.id)
      .eq("status", "active")
      .in("student_id", studentIds);
    if (enrollmentError) throw enrollmentError;
    for (const row of enrollments) if (row.class) classByStudent.set(row.student_id, row.class.name);
  }

  const rows: GuardianRow[] = data.map((guardian) => ({
    id: guardian.id,
    fullName: guardian.full_name,
    phone: guardian.phone,
    email: guardian.email,
    connected: guardian.user_id !== null,
    children: guardian.student_guardians
      .filter((link) => link.student)
      .map(({ student }) => ({
        id: student!.id,
        name: `${student!.first_name} ${student!.last_name}`,
        className: classByStudent.get(student!.id) ?? null,
      })),
  }));
  return rows;
}

/** Nombre de parents, connectés ou non (en-tête de la page, indépendant de la recherche). */
export async function countGuardians(schoolId: string) {
  const supabase = await createClient();
  const [all, connected] = await Promise.all([
    supabase.from("guardians").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("guardians").select("id", { count: "exact", head: true }).eq("school_id", schoolId).not("user_id", "is", null),
  ]);
  return { total: all.count ?? 0, connected: connected.count ?? 0 };
}
