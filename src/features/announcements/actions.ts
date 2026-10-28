"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/auth/permissions";
import { getSchoolContext } from "@/lib/auth/school-context";
import { createClient } from "@/lib/supabase/server";
import { requiredText } from "@/lib/validation";

/** Codes de public.publish_announcement (migration announcements_events). */
const CODES = ["invalidAnnouncement", "noClass", "noGuardian", "noRecipient"] as const;

const announcementSchema = z
  .object({
    title: requiredText(120, 3),
    body: requiredText(4000),
    audience: z.enum(["parents", "classes", "overdue", "staff", "guardians"]),
    classIds: z.array(z.uuid()).max(200),
    guardianIds: z.array(z.uuid()).max(5000),
  })
  .refine((value) => value.audience !== "classes" || value.classIds.length > 0, {
    error: "announcements.errors.noClass",
    path: ["classIds"],
  })
  .refine((value) => value.audience !== "guardians" || value.guardianIds.length > 0, {
    error: "announcements.errors.noGuardian",
    path: ["guardianIds"],
  });

/** Publie une annonce : destinataires figés, prévenus par la cloche. */
export async function publishAnnouncement(
  input: z.input<typeof announcementSchema>,
): Promise<ActionResult<{ recipients: number }>> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.publish(ctx.roles)) return fail("errors.forbidden");
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("publish_announcement", {
    p_school_id: ctx.schoolId,
    p_title: v.title,
    p_body: v.body,
    p_audience: v.audience,
    p_class_ids: v.audience === "classes" ? v.classIds : [],
    p_guardian_ids: v.audience === "guardians" ? v.guardianIds : [],
  });
  if (error) {
    if (error.code === "P0001" && (CODES as readonly string[]).includes(error.message)) {
      return fail(`announcements.errors.${error.message}`);
    }
    return fail(error.message === "forbidden" ? "errors.forbidden" : "errors.unknown");
  }
  refresh();
  return ok({ recipients: (data as { recipients: number }).recipients });
}

/** Supprime une annonce (elle disparaît aussi des cloches). */
export async function deleteAnnouncement(input: { id: string }): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.publish(ctx.roles)) return fail("errors.forbidden");
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", parsed.data.id).eq("school_id", ctx.schoolId);
  if (error) return fail("errors.unknown");
  refresh();
  return ok(undefined);
}
