"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/auth/permissions";
import { getSchoolContext } from "@/lib/auth/school-context";
import { createClient } from "@/lib/supabase/server";

/** Carte perdue : nouveau jeton, l'ancienne carte n'est plus reconnue au pointage. */
export async function renewStudentBadge(input: { studentId: string }): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.managePeople(ctx.roles)) return fail("errors.forbidden");
  const parsed = z.object({ studentId: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("renew_student_badge", { p_student_id: parsed.data.studentId });
  if (error) return fail(error.code === "P0001" && error.message === "forbidden" ? "errors.forbidden" : "errors.unknown");
  refresh();
  return ok(undefined);
}
