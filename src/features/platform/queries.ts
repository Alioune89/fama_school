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
