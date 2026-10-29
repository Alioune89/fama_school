import "server-only";
import { createClient } from "@/lib/supabase/server";
import { renderNotification, type NotificationParams } from "./render";

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  read: boolean;
};

/** Dernières notifications du compte connecté (la RLS limite aux siennes) et nombre de non lues. */
export async function listMyNotifications(limit = 20): Promise<{ items: NotificationItem[]; unread: number }> {
  const supabase = await createClient();
  const [list, count] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, kind, params, link, created_at, read_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);
  if (list.error) throw list.error;
  const items = await Promise.all(
    (list.data ?? []).map(async (row) => ({
      id: row.id,
      ...(await renderNotification(row.kind, (row.params ?? {}) as NotificationParams)),
      link: row.link,
      createdAt: row.created_at,
      read: row.read_at !== null,
    })),
  );
  return { items, unread: count.count ?? 0 };
}

export type NotificationSettings = { push: boolean; sms: boolean; whatsapp: boolean };

/** Canaux choisis par le compte connecté (par défaut : notifications sur le téléphone seulement). */
export async function getNotificationSettings(userId: string): Promise<NotificationSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("notification_settings").select("push, sms, whatsapp").eq("user_id", userId).maybeSingle();
  return data ?? { push: true, sms: false, whatsapp: false };
}
