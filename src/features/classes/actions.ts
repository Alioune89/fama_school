"use server";

import { refresh } from "next/cache";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/auth/permissions";
import { getSchoolContext } from "@/lib/auth/school-context";
import { createClient } from "@/lib/supabase/server";
import { updateClassSchema, type UpdateClassInput } from "./schemas";

/** Nom, salle, capacité et professeur principal d'une classe. */
export async function updateClass(input: UpdateClassInput): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.manageAcademics(ctx.roles)) return fail("errors.forbidden");
  const parsed = updateClassSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .update({ name: v.name, room: v.room, capacity: v.capacity, homeroom_staff_id: v.homeroomStaffId })
    .eq("school_id", ctx.schoolId)
    .eq("id", v.id)
    .select("id");
  if (error) {
    if (error.code === "23505") return fail("validation.form", { name: "classes.errors.duplicateName" });
    if (error.code === "23503") return fail("validation.form", { homeroomStaffId: "errors.notFound" });
    return fail("errors.unknown");
  }
  if (!data?.length) return fail("errors.forbidden");
  refresh();
  return ok(undefined);
}
