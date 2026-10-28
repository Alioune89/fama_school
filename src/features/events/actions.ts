"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/auth/permissions";
import { getSchoolContext } from "@/lib/auth/school-context";
import { createClient } from "@/lib/supabase/server";
import { optionalText, requiredText } from "@/lib/validation";

const isoDate = z.iso.date({ error: "validation.required" });

const eventSchema = z
  .object({
    title: requiredText(120, 3),
    kind: z.enum(["holiday", "exam", "meeting", "event"]),
    startsOn: isoDate,
    endsOn: isoDate,
    description: optionalText(1000),
    staffOnly: z.boolean(),
  })
  .refine((value) => value.endsOn >= value.startsOn, { error: "events.errors.endBeforeStart", path: ["endsOn"] });

/** Ajoute un événement au calendrier de l'école. */
export async function createEvent(input: z.input<typeof eventSchema>): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.publish(ctx.roles)) return fail("errors.forbidden");
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("school_events").insert({
    school_id: ctx.schoolId,
    title: v.title,
    kind: v.kind,
    starts_on: v.startsOn,
    ends_on: v.endsOn,
    description: v.description,
    staff_only: v.staffOnly,
  });
  if (error) return fail(error.code === "23514" ? "events.errors.tooLong" : "errors.unknown");
  refresh();
  return ok(undefined);
}

export async function deleteEvent(input: { id: string }): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.publish(ctx.roles)) return fail("errors.forbidden");
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("school_events").delete().eq("id", parsed.data.id).eq("school_id", ctx.schoolId);
  if (error) return fail("errors.unknown");
  refresh();
  return ok(undefined);
}
