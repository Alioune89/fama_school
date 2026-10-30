import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
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

/**
 * Effectif (élèves actifs) de chaque école, pour le choix de la formule. L'équipe Fama School ne lit pas
 * les élèves : seuls les nombres sortent, par la clé de service. À n'appeler qu'après requireSpace("plateforme").
 */
export async function countActiveStudents(schoolIds: string[]): Promise<Map<string, number>> {
  const admin = createAdminClient();
  const counts = await Promise.all(
    schoolIds.map(async (id) => {
      const { count, error } = await admin
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("school_id", id)
        .eq("status", "active");
      if (error) throw error;
      return [id, count ?? 0] as const;
    }),
  );
  return new Map(counts);
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

/** Demandes de démo pas encore rappelées (bandeau de l'espace plateforme). */
export async function countNewDemoRequests() {
  const supabase = await createClient();
  const { count, error } = await supabase.from("demo_requests").select("id", { count: "exact", head: true }).eq("status", "new");
  if (error) throw error;
  return count ?? 0;
}
