"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/auth/permissions";
import { getSchoolContext } from "@/lib/auth/school-context";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const reminderSchema = z.object({
  studentId: z.uuid(),
  channel: z.enum(["whatsapp", "sms", "call"]),
  overdueAmount: z.number().int().min(0).max(100_000_000),
});

/** Note une relance (le message WhatsApp ou SMS s'ouvre sur l'appareil de la personne qui relance). */
export async function logReminder(input: z.input<typeof reminderSchema>): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.manageFinance(ctx.roles)) return fail("errors.forbidden");
  const parsed = reminderSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("payment_reminders").insert({
    school_id: ctx.schoolId,
    student_id: parsed.data.studentId,
    channel: parsed.data.channel,
    overdue_amount: parsed.data.overdueAmount,
    sent_by: ctx.user.id,
  });
  if (error) return fail("errors.unknown");
  refresh();
  return ok(undefined);
}

/** Réglage de l'école (fondateur, directeur) : bloquer le téléchargement des bulletins en cas d'impayé. */
export async function setReportCardBlock(input: { enabled: boolean }): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.manageSchool(ctx.roles)) return fail("errors.forbidden");
  const parsed = z.object({ enabled: z.boolean() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data } = await supabase.from("schools").select("settings").eq("id", ctx.schoolId).single();
  const current = (data?.settings ?? {}) as Record<string, Json>;
  const { error } = await supabase
    .from("schools")
    .update({ settings: { ...current, blockReportCardsWhenOverdue: parsed.data.enabled } })
    .eq("id", ctx.schoolId);
  if (error) return fail("errors.unknown");
  refresh();
  return ok(undefined);
}
