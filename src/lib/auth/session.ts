import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";
import { listSpaces, type MembershipSummary, type Space, type SpaceEntry } from "./spaces";

/** École active pour les espaces direction et professeur (comptes rattachés à plusieurs écoles). */
export const ACTIVE_SCHOOL_COOKIE = "fama_ecole";

export type CurrentUser = {
  id: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  avatarPath: string | null;
  locale: Enums<"app_locale">;
  isPlatformAdmin: boolean;
  memberships: MembershipSummary[];
  spaces: SpaceEntry[];
};

/**
 * Utilisateur connecté, lu une seule fois par requête (Data Access Layer).
 * Ne lit jamais la session hors d'un <Suspense> : c'est une donnée de requête.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;

  const [profileResult, membershipsResult, adminResult] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, email, avatar_path, locale").eq("id", userId).maybeSingle(),
    supabase.from("school_memberships").select("role, school:schools(id, name)").eq("user_id", userId).eq("status", "active"),
    supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);

  const memberships: MembershipSummary[] = (membershipsResult.data ?? []).flatMap((m) =>
    m.school ? [{ role: m.role, schoolId: m.school.id, schoolName: m.school.name }] : [],
  );
  const isPlatformAdmin = Boolean(adminResult.data);
  const profile = profileResult.data;

  return {
    id: userId,
    fullName: profile?.full_name ?? null,
    phone: profile?.phone ?? null,
    email: profile?.email ?? null,
    avatarPath: profile?.avatar_path ?? null,
    locale: profile?.locale ?? "fr",
    isPlatformAdmin,
    memberships,
    spaces: listSpaces(memberships, isPlatformAdmin),
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/connexion", locale: await getLocale() });
  return user!;
}

/**
 * Vérifie l'accès à un espace et renvoie l'école active.
 * La RLS protège les données ; ce contrôle évite d'afficher un espace vide ou étranger.
 */
export async function requireSpace(space: Space): Promise<{ user: CurrentUser; entry: SpaceEntry }> {
  const user = await requireUser();
  const candidates = user.spaces.filter((entry) => entry.space === space);
  if (candidates.length === 0) redirect({ href: "/choisir-espace", locale: await getLocale() });

  if (space === "direction" || space === "professeur") {
    const activeSchoolId = (await cookies()).get(ACTIVE_SCHOOL_COOKIE)?.value;
    const entry = candidates.find((candidate) => candidate.schoolId === activeSchoolId) ?? candidates[0]!;
    return { user, entry };
  }
  return { user, entry: candidates[0]! };
}
