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

const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(10).max(100) }),
  userAgent: z.string().max(300).optional(),
});

/** Abonne l'appareil du navigateur aux notifications push du compte connecté. */
export async function savePushSubscription(input: z.input<typeof subscriptionSchema>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("errors.forbidden");
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return fail("notifications.settings.pushFailed");
  const { endpoint, keys, userAgent } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
    p_user_agent: userAgent,
  });
  if (error) return fail("errors.unknown");
  return ok(undefined);
}

/** Retire l'abonnement push de cet appareil. */
export async function removePushSubscription(input: { endpoint: string }): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("errors.forbidden");
  const parsed = z.object({ endpoint: z.string().max(1000) }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", parsed.data.endpoint);
  if (error) return fail("errors.unknown");
  return ok(undefined);
}
