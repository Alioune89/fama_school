import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Écoles clientes (lecture réservée à l'équipe Fama School par la RLS). */
export async function listSchools() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schools")
    .select("id, name, slug, city, plan, status, school_memberships(count)")
    .order("name");
  if (error) throw error;

  return (data ?? []).map(({ school_memberships, ...school }) => ({
    ...school,
    members: school_memberships[0]?.count ?? 0,
  }));
}

/** Demandes de démo de la page d'accueil, les plus récentes d'abord (RLS : équipe Fama School). */
export async function listDemoRequests() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("demo_requests")
    .select("id, full_name, school_name, role, phone, email, city, students_range, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}
