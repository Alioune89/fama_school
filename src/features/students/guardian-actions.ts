"use server";

import { refresh } from "next/cache";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/auth/permissions";
import { getSchoolContext } from "@/lib/auth/school-context";
import { createClient } from "@/lib/supabase/server";
import {
  addGuardianSchema,
  guardianLinkSchema,
  updateGuardianSchema,
  type AddGuardianInput,
  type UpdateGuardianInput,
} from "./schemas";

/** Codes renvoyés par les fonctions SQL des parents (voir la migration guardian_management). */
const GUARDIAN_CODES = ["unknownStudent", "invalidGuardian", "alreadyLinked", "unknownGuardian", "lastGuardian"] as const;

function guardianError(error: { code?: string; message?: string }) {
  if (error.code === "P0001" && error.message === "forbidden") return fail("errors.forbidden");
  if (error.code === "P0001" && (GUARDIAN_CODES as readonly string[]).includes(error.message ?? "")) {
    return fail(`students.guardians.errors.${error.message}`);
  }
  if (error.code === "23505") return fail("validation.form", { phone: "students.guardians.errors.phoneTaken" });
  if (error.code === "23514") return fail("validation.form", { phone: "validation.invalidPhone" });
  return fail("errors.unknown");
}

/** Ajoute un parent ou tuteur ; un numéro déjà connu de l'école réutilise la fiche existante (fratries). */
export async function addGuardian(input: AddGuardianInput): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.managePeople(ctx.roles)) return fail("errors.forbidden");
  const parsed = addGuardianSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_student_guardian", {
    p_school_id: ctx.schoolId,
    p_student_id: v.studentId,
    p_guardian: { full_name: v.fullName, phone: v.phone, relationship: v.relationship, is_primary: v.isPrimary },
  });
  if (error) return guardianError(error);
  refresh();
  return ok(undefined);
}

/**
 * Coordonnées du parent (partagées avec ses autres enfants) et lien avec cet élève.
 * Le numéro d'un parent qui a déjà un compte ne change pas ici : c'est son identifiant de connexion.
 */
export async function updateGuardian(input: UpdateGuardianInput): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.managePeople(ctx.roles)) return fail("errors.forbidden");
  const parsed = updateGuardianSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { data: link } = await supabase
    .from("student_guardians")
    .select("guardian:guardians(phone, user_id)")
    .eq("school_id", ctx.schoolId)
    .eq("student_id", v.studentId)
    .eq("guardian_id", v.guardianId)
    .maybeSingle();
  if (!link?.guardian) return fail("students.guardians.errors.unknownGuardian");
  if (link.guardian.user_id && v.phone !== link.guardian.phone) {
    return fail("validation.form", { phone: "students.guardians.errors.phoneLocked" });
  }

  const { error } = await supabase
    .from("guardians")
    .update({ full_name: v.fullName, phone: v.phone, profession: v.profession })
    .eq("school_id", ctx.schoolId)
    .eq("id", v.guardianId);
  if (error) return guardianError(error);

  const { error: linkError } = await supabase
    .from("student_guardians")
    .update({ relationship: v.relationship })
    .eq("school_id", ctx.schoolId)
    .eq("student_id", v.studentId)
    .eq("guardian_id", v.guardianId);
  if (linkError) return fail("errors.unknown");
  refresh();
  return ok(undefined);
}

/** Contact principal : le parent que l'école appelle en premier. */
export async function setPrimaryGuardian(input: { studentId: string; guardianId: string }): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.managePeople(ctx.roles)) return fail("errors.forbidden");
  const parsed = guardianLinkSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_primary_guardian", {
    p_school_id: ctx.schoolId,
    p_student_id: parsed.data.studentId,
    p_guardian_id: parsed.data.guardianId,
  });
  if (error) return guardianError(error);
  refresh();
  return ok(undefined);
}

/** Retire le parent de cet élève seulement (sa fiche reste pour ses autres enfants). */
export async function removeGuardian(input: { studentId: string; guardianId: string }): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.managePeople(ctx.roles)) return fail("errors.forbidden");
  const parsed = guardianLinkSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_student_guardian", {
    p_school_id: ctx.schoolId,
    p_student_id: parsed.data.studentId,
    p_guardian_id: parsed.data.guardianId,
  });
  if (error) return guardianError(error);
  refresh();
  return ok(undefined);
}
