"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/auth/permissions";
import { getSchoolContext } from "@/lib/auth/school-context";
import { createClient } from "@/lib/supabase/server";
import {
  assignmentSchema,
  staffMemberSchema,
  updateStaffMemberSchema,
  type AssignmentInput,
  type StaffMemberInput,
  type UpdateStaffMemberInput,
} from "./schemas";

/** Ajoute une personne au répertoire : elle est invitée et recevra l'accès avec son numéro. */
export async function addStaffMember(input: StaffMemberInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await getSchoolContext("direction");
  if (!ctx) return fail("errors.forbidden");
  const parsed = staffMemberSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  if (!permissions.inviteRole(ctx.roles, v.role)) return fail("errors.forbidden");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("school_staff")
    .insert({
      school_id: ctx.schoolId,
      full_name: v.fullName,
      phone: v.phone,
      email: v.email,
      role: v.role,
      title: v.title,
      contract: v.role === "teacher" ? (v.contract ?? "permanent") : null,
      sex: v.sex,
      cycle: v.role === "teacher" ? v.cycle : null,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return fail("validation.form", { phone: "staff.errors.duplicate" });
    if (error.code === "42501") return fail("errors.forbidden");
    return fail("errors.unknown");
  }
  refresh();
  return ok({ id: data.id });
}

export async function updateStaffMember(input: UpdateStaffMemberInput): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx) return fail("errors.forbidden");
  const parsed = updateStaffMemberSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("school_staff")
    .update({
      full_name: v.fullName,
      phone: v.phone,
      email: v.email,
      title: v.title,
      contract: v.contract,
      sex: v.sex,
      cycle: v.cycle,
    })
    .eq("school_id", ctx.schoolId)
    .eq("id", v.id)
    .select("id");
  if (error) return fail(error.code === "23505" ? "staff.errors.duplicate" : "errors.unknown");
  if (!data?.length) return fail("errors.forbidden");
  refresh();
  return ok(undefined);
}

/** Désactiver suspend l'accès (déclencheur en base) ; réactiver le rétablit. */
export async function setStaffStatus(input: { id: string; status: "active" | "inactive" }): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx) return fail("errors.forbidden");
  const parsed = z.object({ id: z.uuid(), status: z.enum(["active", "inactive"]) }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("school_staff")
    .update({ status: parsed.data.status })
    .eq("school_id", ctx.schoolId)
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return fail("errors.unknown");
  if (!data?.length) return fail("errors.forbidden");
  refresh();
  return ok(undefined);
}

/** Affecte un professeur à une matière d'une classe (remplace l'affectation précédente s'il y en avait une). */
export async function assignTeaching(input: AssignmentInput): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.manageAcademics(ctx.roles)) return fail("errors.forbidden");
  const parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("teaching_assignments")
    .upsert(
      {
        school_id: ctx.schoolId,
        class_id: parsed.data.classId,
        subject_id: parsed.data.subjectId,
        staff_id: parsed.data.staffId,
      },
      { onConflict: "class_id,subject_id" },
    );
  if (error) return fail(error.code === "23503" ? "errors.notFound" : "errors.unknown");
  refresh();
  return ok(undefined);
}

export async function removeTeaching(input: { assignmentId: string }): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.manageAcademics(ctx.roles)) return fail("errors.forbidden");
  const parsed = z.object({ assignmentId: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("teaching_assignments")
    .delete()
    .eq("school_id", ctx.schoolId)
    .eq("id", parsed.data.assignmentId);
  if (error) return fail("errors.unknown");
  refresh();
  return ok(undefined);
}

/** Professeur principal d'une classe (null pour retirer). */
export async function setHomeroom(input: { classId: string; staffId: string | null }): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.manageAcademics(ctx.roles)) return fail("errors.forbidden");
  const parsed = z.object({ classId: z.uuid(), staffId: z.uuid().nullable() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update({ homeroom_staff_id: parsed.data.staffId })
    .eq("school_id", ctx.schoolId)
    .eq("id", parsed.data.classId);
  if (error) return fail("errors.unknown");
  refresh();
  return ok(undefined);
}
