import "server-only";
import { STAFF_ROLES } from "@/lib/auth/spaces";
import { createClient } from "@/lib/supabase/server";

export type DirectionCounts = {
  teachers: number;
  staff: number;
  parents: number;
  pendingInvitations: number;
};

/** Effectifs de l'école active (la RLS garantit que seules les données de cette école sont lues). */
export async function getDirectionCounts(schoolId: string): Promise<DirectionCounts> {
  const supabase = await createClient();
  const members = () =>
    supabase.from("school_memberships").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("status", "active");

  const [teachers, staff, parents, invitations] = await Promise.all([
    members().eq("role", "teacher"),
    members().in("role", [...STAFF_ROLES]),
    members().eq("role", "parent"),
    supabase
      .from("invitations")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .is("accepted_at", null),
  ]);

  return {
    teachers: teachers.count ?? 0,
    staff: staff.count ?? 0,
    parents: parents.count ?? 0,
    pendingInvitations: invitations.count ?? 0,
  };
}
