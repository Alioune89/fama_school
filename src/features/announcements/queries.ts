import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AnnouncementAudience = "parents" | "classes" | "overdue" | "staff" | "guardians";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  classNames: string[];
  /** Parents choisis un par un (audience « guardians »). */
  guardianNames: string[];
  recipientCount: number;
  publishedByName: string;
  publishedAt: string;
};

/**
 * Annonces lisibles par le compte connecté, des plus récentes aux plus anciennes : toutes celles de l'école pour
 * la direction (avec `schoolId`), celles qui lui sont adressées pour un parent ou un enseignant (la RLS limite).
 */
export async function listAnnouncements(schoolId?: string): Promise<Announcement[]> {
  const supabase = await createClient();
  let query = supabase
    .from("announcements")
    .select("id, title, body, audience, class_ids, guardian_ids, recipient_count, published_by_name, published_at")
    .order("published_at", { ascending: false })
    .limit(100);
  if (schoolId) query = query.eq("school_id", schoolId);
  const { data, error } = await query;
  if (error) throw error;
  const classIds = [...new Set((data ?? []).flatMap((row) => row.class_ids))];
  const { data: classes } = classIds.length
    ? await supabase.from("classes").select("id, name").in("id", classIds)
    : { data: [] as { id: string; name: string }[] };
  const names = new Map((classes ?? []).map((c) => [c.id, c.name]));
  const guardianIds = [...new Set((data ?? []).flatMap((row) => row.guardian_ids))];
  const { data: guardians } = guardianIds.length
    ? await supabase.from("guardians").select("id, full_name").in("id", guardianIds)
    : { data: [] as { id: string; full_name: string }[] };
  const guardianNames = new Map((guardians ?? []).map((g) => [g.id, g.full_name]));
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    audience: row.audience as AnnouncementAudience,
    classNames: row.class_ids.flatMap((id) => names.get(id) ?? []).sort((a, b) => a.localeCompare(b, "fr", { numeric: true })),
    guardianNames: row.guardian_ids.flatMap((id) => guardianNames.get(id) ?? []),
    recipientCount: row.recipient_count,
    publishedByName: row.published_by_name,
    publishedAt: row.published_at,
  }));
}

export type GuardianOption = {
  id: string;
  name: string;
  phone: string | null;
  /** Le parent s'est déjà connecté : il recevra l'annonce. */
  hasAccount: boolean;
  children: { name: string; classId: string | null; className: string | null }[];
};

/** Parents de l'école, avec leurs enfants inscrits cette année et leur classe (choix des destinataires). */
export async function listGuardianOptions(schoolId: string): Promise<GuardianOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("guardians")
    .select(
      "id, full_name, phone, user_id, student_guardians(student:students(first_name, last_name, enrollments(status, class:classes!enrollments_class_id_school_id_fkey(id, name, year:academic_years(is_current)))))",
    )
    .eq("school_id", schoolId)
    .limit(5000);
  if (error) throw error;
  return (data ?? [])
    .map((guardian) => ({
      id: guardian.id,
      name: guardian.full_name,
      phone: guardian.phone,
      hasAccount: guardian.user_id !== null,
      children: guardian.student_guardians.flatMap((link) => {
        const student = link.student;
        if (!student) return [];
        const current = student.enrollments.find((e) => e.status === "active" && e.class?.year?.is_current);
        return [
          {
            name: `${student.first_name} ${student.last_name}`,
            classId: current?.class?.id ?? null,
            className: current?.class?.name ?? null,
          },
        ];
      }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
