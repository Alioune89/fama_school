"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { Constants } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
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

const demoStatusSchema = z.object({ id: z.uuid(), status: z.enum(Constants.public.Enums.demo_request_status) });

/** Suivi d'une demande de démo (nouvelle → rappelée → démo prévue → close). */
export async function setDemoRequestStatus(input: z.input<typeof demoStatusSchema>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user?.isPlatformAdmin) return fail("errors.forbidden");
  const parsed = demoStatusSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("demo_requests")
    .update({ status: parsed.data.status, handled_by: user.id })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return fail("errors.unknown");
  if (!data?.length) return fail("errors.notFound");
  refresh();
  return ok(undefined);
}
