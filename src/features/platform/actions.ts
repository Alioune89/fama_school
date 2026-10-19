"use server";

import { refresh } from "next/cache";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSchoolSchema, type CreateSchoolInput } from "./schemas";

/**
 * Crée une école cliente et inscrit son directeur au répertoire (ce qui l'invite).
 * Réservé à l'équipe Fama School : la formule et le statut ne sont jamais modifiables par l'école.
 */
export async function createSchool(input: CreateSchoolInput): Promise<ActionResult<{ id: string; slug: string }>> {
  const user = await getCurrentUser();
  if (!user?.isPlatformAdmin) return fail("errors.forbidden");

  const parsed = createSchoolSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const value = parsed.data;

  const admin = createAdminClient();
  const { data: school, error } = await admin
    .from("schools")
    .insert({
      name: value.name,
      slug: value.slug,
      city: value.city,
      region: value.region,
      plan: value.plan,
      status: "trial",
      created_by: user.id,
    })
    .select("id, slug")
    .single();

  if (error) {
    if (error.code === "23505") return fail("validation.form", { slug: "validation.slugTaken" });
    console.error("Création d'école impossible :", error);
    return fail("errors.unknown");
  }

  const { error: staffError } = await admin.from("school_staff").insert({
    school_id: school.id,
    full_name: value.directorName,
    phone: value.directorPhone,
    email: value.directorEmail,
    role: "director",
    title: "Directeur",
    created_by: user.id,
  });

  if (staffError) {
    // Pas d'école sans directeur : on annule la création.
    await admin.from("schools").delete().eq("id", school.id);
    console.error("Inscription du directeur impossible :", staffError);
    return fail("errors.unknown");
  }

  refresh();
  return ok(school);
}
