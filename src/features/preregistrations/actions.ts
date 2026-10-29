"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/auth/permissions";
import { getSchoolContext } from "@/lib/auth/school-context";
import { activeChannelProvider } from "@/features/notifications/channels";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import {
  decisionSchema,
  enrollSchema,
  prepareUploadsSchema,
  preregistrationSchema,
  type DecisionInput,
  type EnrollInput,
  type PreregistrationInput,
} from "./schemas";

const BUCKET = "preregistrations";

/**
 * Adresses d'envoi signées pour les pièces jointes d'une demande (<école>/<uuid>.<ext>) : le visiteur n'a aucun
 * droit sur le stockage, le serveur lui ouvre seulement ces emplacements, pour une école au site publié.
 */
export async function prepareUploads(input: {
  slug: string;
  kinds: ("jpg" | "pdf")[];
}): Promise<ActionResult<{ path: string; token: string }[]>> {
  const parsed = prepareUploadsSchema.safeParse(input);
  if (!parsed.success) return fail("errors.unknown");
  const { data: site, error } = await createPublicClient().rpc("public_school_site", { p_slug: parsed.data.slug });
  if (error || !site) return fail("preregistrations.errors.unknownSchool");
  const schoolId = (site as { schoolId: string }).schoolId;

  const storage = createAdminClient().storage.from(BUCKET);
  const slots: { path: string; token: string }[] = [];
  for (const kind of parsed.data.kinds) {
    const { data, error: signError } = await storage.createSignedUploadUrl(`${schoolId}/${crypto.randomUUID()}.${kind}`);
    if (signError) return fail("preregistrations.errors.uploadFailed");
    slots.push({ path: data.path, token: data.token });
  }
  return ok(slots);
}

const SUBMIT_CODES = ["unknownSchool", "unknownLevel", "invalidAttachment", "tooManyRequests", "invalidValue"] as const;

/** Demande de pré-inscription déposée par un parent ; renvoie sa référence (P2026-0001). */
export async function submitPreregistration(input: PreregistrationInput): Promise<ActionResult<{ reference: string }>> {
  const parsed = preregistrationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  // Un robot remplit le champ piège : on lui répond comme à tout le monde, sans rien enregistrer.
  if (v.website) return ok({ reference: `P${new Date().getFullYear()}-0000` });

  const { data, error } = await createPublicClient().rpc("submit_preregistration", {
    p_slug: v.slug,
    p_data: {
      level_id: v.levelId,
      child_first_name: v.childFirstName,
      child_last_name: v.childLastName,
      child_sex: v.childSex,
      child_birth_date: v.childBirthDate,
      previous_school: v.previousSchool,
      guardian_name: v.guardianName,
      guardian_phone: v.guardianPhone,
      guardian_relationship: v.guardianRelationship,
      guardian_email: v.guardianEmail,
      message: v.message,
      attachments: v.attachments,
    },
  });
  if (error) {
    const code = SUBMIT_CODES.find((c) => error.code === "P0001" && error.message === c);
    if (code === "unknownLevel") return fail("validation.form", { levelId: "preregistrations.errors.levelRequired" });
    return fail(code ? `preregistrations.errors.${code}` : "errors.unknown");
  }
  return ok({ reference: data });
}

/** SMS au parent après une décision ou l'inscription, sans retarder la réponse ; false si l'envoi est fermé. */
async function notifyGuardian(
  id: string,
  kind: "accepted" | "rejected" | "enrolled",
  note: string | null = null,
): Promise<boolean> {
  const provider = activeChannelProvider();
  if (!provider) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("preregistrations")
    .select("reference, child_first_name, guardian_phone, school:schools(name)")
    .eq("id", id)
    .single();
  if (!data) return false;
  // Hors d'une page, la langue n'est pas connue : le SMS part dans la langue par défaut de l'école.
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "preregistrations.sms" });
  const text = t(kind, { school: data.school.name, child: data.child_first_name, reference: data.reference, note: note ?? "" });
  after(async () => {
    const result = await provider.send("sms", data.guardian_phone, text.trim());
    if (!result.ok) console.error(`Pré-inscription ${data.reference} : SMS non envoyé (${result.error})`);
  });
  return true;
}

/** La direction retient ou refuse une demande (avec un mot pour le parent). */
export async function decidePreregistration(input: DecisionInput): Promise<ActionResult<{ notified: boolean }>> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.managePeople(ctx.roles)) return fail("errors.forbidden");
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("preregistrations")
    .update({ status: v.status, decision_note: v.note })
    .eq("school_id", ctx.schoolId)
    .eq("id", v.id)
    .select("id");
  if (error) return fail(error.message === "alreadyEnrolled" ? "preregistrations.errors.alreadyEnrolled" : "errors.unknown");
  if (!data?.length) return fail("errors.forbidden");
  const notified = await notifyGuardian(v.id, v.status, v.note);
  refresh();
  return ok({ notified });
}

/** Inscription de l'enfant en un clic : fiche, classe et parent ; renvoie l'élève créé. */
export async function enrollPreregistration(input: EnrollInput): Promise<ActionResult<{ studentId: string; notified: boolean }>> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.managePeople(ctx.roles)) return fail("errors.forbidden");
  const parsed = enrollSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("enroll_preregistration", {
    p_id: v.id,
    p_class_id: v.classId,
    p_matricule: v.matricule ?? undefined,
  });
  if (error) {
    if (error.code === "23505") return fail("validation.form", { matricule: "students.errors.duplicateMatricule" });
    if (error.message === "unknownClass") return fail("validation.form", { classId: "students.errors.unknownClass" });
    if (error.message === "alreadyEnrolled") return fail("preregistrations.errors.alreadyEnrolled");
    return fail(error.message === "forbidden" ? "errors.forbidden" : "errors.unknown");
  }
  const notified = await notifyGuardian(v.id, "enrolled");
  refresh();
  return ok({ studentId: data, notified });
}
