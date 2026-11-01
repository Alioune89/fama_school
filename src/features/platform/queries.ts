import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { computeSetupStatus } from "@/features/setup/steps";
import { latest } from "./health";

/** Écoles clientes (lecture réservée à l'équipe Fama School par la RLS). */
export async function listSchools() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schools")
    .select("id, name, slug, city, plan, status, subscription_ends_on, school_memberships(count)")
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

type AdminClient = ReturnType<typeof createAdminClient>;

/** Dernier appel, dernière note et dernier encaissement d'une école : seules des dates sortent. */
async function lastActivity(admin: AdminClient, schoolId: string) {
  const [session, grade, payment] = await Promise.all([
    admin
      .from("attendance_sessions")
      .select("taken_at")
      .eq("school_id", schoolId)
      .order("taken_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("grades")
      .select("updated_at")
      .eq("school_id", schoolId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("payments")
      .select("created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  for (const result of [session, grade, payment]) if (result.error) throw result.error;
  return latest(session.data?.taken_at, grade.data?.updated_at, payment.data?.created_at);
}

/** Date de la dernière activité de chaque école. À n'appeler qu'après requireSpace("plateforme"). */
export async function lastActivityBySchool(schoolIds: string[]): Promise<Map<string, string | null>> {
  const admin = createAdminClient();
  const dates = await Promise.all(schoolIds.map(async (id) => [id, await lastActivity(admin, id)] as const));
  return new Map(dates);
}

const ACTIVITY_WINDOW_DAYS = 7;
const ROLE_ORDER: Enums<"app_role">[] = [
  "owner",
  "director",
  "censor",
  "supervisor",
  "accountant",
  "secretary",
  "teacher",
  "driver",
];

/**
 * Fiche d'une école pour l'équipe Fama School : contact, équipe, mise en route et activité de la semaine.
 * Aucun nom d'élève ni de parent : seulement des nombres. À n'appeler qu'après requireSpace("plateforme").
 */
export async function getSchoolDetail(schoolId: string) {
  const admin = createAdminClient();
  const { data: school, error } = await admin
    .from("schools")
    .select("id, name, slug, city, region, address, phone, email, plan, status, settings, created_at, subscription_ends_on")
    .eq("id", schoolId)
    .maybeSingle();
  if (error) throw error;
  if (!school) return null;

  const since = new Date(Date.now() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const count = { count: "exact", head: true } as const;
  const [
    memberships,
    invitations,
    students,
    rollCalls,
    grades,
    payments,
    guardians,
    connectedGuardians,
    year,
    levels,
    levelSubjects,
    last,
    subscriptionPayments,
  ] = await Promise.all([
    admin.from("school_memberships").select("user_id, role, status").eq("school_id", schoolId).neq("role", "parent"),
    admin
      .from("invitations")
      .select("id, full_name, role, phone, email, created_at")
      .eq("school_id", schoolId)
      .neq("role", "parent")
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at"),
    admin.from("students").select("id", count).eq("school_id", schoolId).eq("status", "active"),
    admin.from("attendance_sessions").select("id", count).eq("school_id", schoolId).gte("taken_at", since),
    admin.from("grades").select("student_id", count).eq("school_id", schoolId).gte("updated_at", since),
    admin.from("payments").select("id", count).eq("school_id", schoolId).neq("status", "cancelled").gte("created_at", since),
    admin.from("guardians").select("id", count).eq("school_id", schoolId),
    admin.from("guardians").select("id", count).eq("school_id", schoolId).not("user_id", "is", null),
    admin.from("academic_years").select("id").eq("school_id", schoolId).eq("is_current", true).maybeSingle(),
    admin.from("levels").select("id", count).eq("school_id", schoolId),
    admin.from("level_subjects").select("level_id", count).eq("school_id", schoolId),
    lastActivity(admin, schoolId),
    admin
      .from("subscription_payments")
      .select("id, amount, method, paid_on, covers_until, reference")
      .eq("school_id", schoolId)
      .order("paid_on", { ascending: false })
      .limit(24),
  ]);
  for (const result of [
    memberships,
    invitations,
    students,
    rollCalls,
    grades,
    payments,
    guardians,
    connectedGuardians,
    year,
    levels,
    levelSubjects,
    subscriptionPayments,
  ]) {
    if (result.error) throw result.error;
  }

  const classes = year.data
    ? await admin.from("classes").select("id", count).eq("school_id", schoolId).eq("academic_year_id", year.data.id)
    : { count: 0, error: null };
  if (classes.error) throw classes.error;

  // Un compte peut cumuler plusieurs rôles : une ligne par personne.
  const byUser = new Map<string, { roles: Enums<"app_role">[]; active: boolean }>();
  for (const membership of memberships.data ?? []) {
    const entry = byUser.get(membership.user_id) ?? { roles: [], active: false };
    entry.roles.push(membership.role);
    entry.active ||= membership.status === "active";
    byUser.set(membership.user_id, entry);
  }
  const userIds = [...byUser.keys()];
  const [profiles, signIns] = await Promise.all([
    userIds.length > 0
      ? admin.from("profiles").select("id, full_name, phone, email").in("id", userIds)
      : { data: [], error: null },
    Promise.all(
      userIds.map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id);
        return [id, data.user?.last_sign_in_at ?? null] as const;
      }),
    ),
  ]);
  if (profiles.error) throw profiles.error;
  const profileById = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]));
  const lastSignIn = new Map(signIns);
  const rank = (roles: Enums<"app_role">[]) => Math.min(...roles.map((role) => ROLE_ORDER.indexOf(role)));

  const team = userIds
    .map((id) => {
      const entry = byUser.get(id)!;
      const profile = profileById.get(id);
      return {
        id,
        name: profile?.full_name ?? profile?.email ?? profile?.phone ?? "—",
        phone: profile?.phone ?? null,
        email: profile?.email ?? null,
        roles: [...entry.roles].sort((a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b)),
        active: entry.active,
        lastSignIn: lastSignIn.get(id) ?? null,
      };
    })
    .sort((a, b) => rank(a.roles) - rank(b.roles) || a.name.localeCompare(b.name, "fr"));

  const settings = (school.settings ?? {}) as Record<string, unknown>;
  const setup = computeSetupStatus({
    school: { city: school.city, phone: school.phone },
    hasCurrentYear: Boolean(year.data),
    levelsCount: levels.count ?? 0,
    levelSubjectsCount: levelSubjects.count ?? 0,
    classesCount: classes.count ?? 0,
    evaluationSaved: "evaluationWeights" in settings || "mentionThresholds" in settings,
  });

  return {
    school,
    team,
    invitations: invitations.data ?? [],
    subscriptionPayments: subscriptionPayments.data ?? [],
    setup,
    activity: {
      windowDays: ACTIVITY_WINDOW_DAYS,
      activeStudents: students.count ?? 0,
      rollCalls: rollCalls.count ?? 0,
      grades: grades.count ?? 0,
      payments: payments.count ?? 0,
      guardians: guardians.count ?? 0,
      connectedGuardians: connectedGuardians.count ?? 0,
      lastActivity: last,
    },
  };
}

export type SchoolDetail = NonNullable<Awaited<ReturnType<typeof getSchoolDetail>>>;
