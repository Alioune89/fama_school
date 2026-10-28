import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AnnouncementAudience = "parents" | "classes" | "overdue" | "staff";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  classNames: string[];
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
    .select("id, title, body, audience, class_ids, recipient_count, published_by_name, published_at")
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
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    audience: row.audience as AnnouncementAudience,
    classNames: row.class_ids.flatMap((id) => names.get(id) ?? []).sort((a, b) => a.localeCompare(b, "fr", { numeric: true })),
    recipientCount: row.recipient_count,
    publishedByName: row.published_by_name,
    publishedAt: row.published_at,
  }));
}
