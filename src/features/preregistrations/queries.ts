import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { siteTag } from "@/features/school-site/queries";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import type { PreregistrationStatus } from "./schemas";

export type LevelOption = { id: string; label: string; cycle: string };

/** Niveaux proposés sur le formulaire public ; vide si l'école n'a pas de site publié. */
export async function getPreregistrationLevels(slug: string): Promise<LevelOption[]> {
  "use cache";
  cacheTag(siteTag(slug));
  cacheLife("hours");
  const { data, error } = await createPublicClient().rpc("preregistration_levels", { p_slug: slug });
  if (error) throw error;
  return data as LevelOption[];
}

const LIST_COLUMNS =
  "id, reference, status, created_at, child_first_name, child_last_name, child_sex, guardian_name, guardian_phone, attachments, level:levels(label)";

export type PreregistrationRow = {
  id: string;
  reference: string;
  status: PreregistrationStatus;
  createdAt: string;
  childName: string;
  childSex: "F" | "M";
  levelLabel: string | null;
  guardianName: string;
  guardianPhone: string;
  attachmentCount: number;
};

/** Demandes de l'école, les plus récentes d'abord, avec le nombre de demandes par statut. */
export async function listPreregistrations(schoolId: string, status: PreregistrationStatus | null) {
  const supabase = await createClient();
  let query = supabase.from("preregistrations").select(LIST_COLUMNS).eq("school_id", schoolId);
  if (status) query = query.eq("status", status);
  const [{ data, error }, { data: all, error: countError }] = await Promise.all([
    query.order("created_at", { ascending: false }).limit(200),
    supabase.from("preregistrations").select("status").eq("school_id", schoolId),
  ]);
  if (error) throw error;
  if (countError) throw countError;

  const counts: Partial<Record<PreregistrationStatus, number>> = {};
  for (const row of all ?? []) counts[row.status] = (counts[row.status] ?? 0) + 1;
  const rows: PreregistrationRow[] = (data ?? []).map((row) => ({
    id: row.id,
    reference: row.reference,
    status: row.status,
    createdAt: row.created_at,
    childName: `${row.child_first_name} ${row.child_last_name}`,
    childSex: row.child_sex,
    levelLabel: row.level?.label ?? null,
    guardianName: row.guardian_name,
    guardianPhone: row.guardian_phone,
    attachmentCount: (row.attachments as unknown[]).length,
  }));
  return { rows, counts };
}

/** Nombre de demandes en attente (pastille du bouton sur la liste des élèves). */
export async function countPendingPreregistrations(schoolId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("preregistrations")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

export type PreregistrationDetail = Awaited<ReturnType<typeof getPreregistration>>;

/** Une demande avec ses pièces jointes (liens signés pour 10 minutes). */
export async function getPreregistration(schoolId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("preregistrations")
    .select("*, level:levels(id, label), student:students(id)")
    .eq("school_id", schoolId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const files = data.attachments as { path: string; name: string }[];
  const { data: signed } = files.length
    ? await supabase.storage.from("preregistrations").createSignedUrls(
        files.map((file) => file.path),
        600,
      )
    : { data: [] };
  return {
    id: data.id,
    reference: data.reference,
    status: data.status,
    createdAt: data.created_at,
    decidedAt: data.decided_at,
    decisionNote: data.decision_note,
    level: data.level,
    studentId: data.student?.id ?? null,
    child: {
      firstName: data.child_first_name,
      lastName: data.child_last_name,
      sex: data.child_sex,
      birthDate: data.child_birth_date,
      previousSchool: data.previous_school,
    },
    guardian: {
      name: data.guardian_name,
      phone: data.guardian_phone,
      relationship: data.guardian_relationship,
      email: data.guardian_email,
    },
    message: data.message,
    attachments: files.map((file, index) => ({ ...file, url: signed?.[index]?.signedUrl ?? null })),
  };
}

/** Classes de l'année en cours, celles du niveau demandé d'abord. */
export async function listEnrollmentClasses(schoolId: string, levelId: string | null) {
  const supabase = await createClient();
  const { data: year, error: yearError } = await supabase
    .from("academic_years")
    .select("id")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();
  if (yearError) throw yearError;
  if (!year) return [];
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, level_id, level:levels(position)")
    .eq("school_id", schoolId)
    .eq("academic_year_id", year.id);
  if (error) throw error;
  return (data ?? [])
    .map((c) => ({ id: c.id, name: c.name, matches: c.level_id === levelId, position: c.level?.position ?? 0 }))
    .sort((a, b) => Number(b.matches) - Number(a.matches) || a.position - b.position || a.name.localeCompare(b.name, "fr"))
    .map(({ id, name, matches }) => ({ id, name, matches }));
}
