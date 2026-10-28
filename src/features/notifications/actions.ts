"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Marque une notification (ou toutes, sans identifiant) comme lue. La RLS limite aux siennes. */
export async function markNotificationsRead(input: { id?: string }): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("errors.forbidden");
  const parsed = z.object({ id: z.uuid().optional() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  let query = supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (parsed.data.id) query = query.eq("id", parsed.data.id);
  const { error } = await query;
  if (error) return fail("errors.unknown");
  refresh();
  return ok(undefined);
}

const settingsSchema = z.object({ push: z.boolean(), sms: z.boolean(), whatsapp: z.boolean() });

/** Canaux de notification du compte connecté. */
export async function saveNotificationSettings(input: z.input<typeof settingsSchema>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("errors.forbidden");
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_settings")
    .upsert({ user_id: user.id, ...parsed.data, updated_at: new Date().toISOString() });
  if (error) return fail("errors.unknown");
  refresh();
  return ok(undefined);
}
