import "server-only";
import { getTranslations } from "next-intl/server";
import { formatDate, formatXOF } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  read: boolean;
};

type Params = Record<string, string | number | null | undefined>;

/** Rédige une notification dans la langue de l'utilisateur, à partir de son type et de ses paramètres. */
async function render(kind: string, params: Params): Promise<{ title: string; body: string }> {
  const [t, tAttendance, tReports] = await Promise.all([
    getTranslations("notifications.kinds"),
    getTranslations("attendance"),
    getTranslations("reports.categories"),
  ]);
  const text = (value: unknown) => (value === null || value === undefined ? "" : String(value));
  const values: Record<string, string> = Object.fromEntries(Object.entries(params).map(([key, value]) => [key, text(value)]));
  switch (kind) {
    case "attendance":
      values.slot = tAttendance(`slots.${values.slot as "morning" | "afternoon"}`).toLowerCase();
      values.date = values.date ? formatDate(values.date, { weekday: "long", day: "numeric", month: "long" }) : "";
      break;
    case "studentReport":
      values.category = tReports(values.category as "behavior");
      break;
    case "invoiceIssued":
      values.total = formatXOF(Number(params.total ?? 0));
      values.dueOn = values.dueOn ? formatDate(values.dueOn, { day: "numeric", month: "long" }) : "";
      break;
    case "paymentReceived":
    case "paymentCancelRequested":
      values.amount = formatXOF(Number(params.amount ?? 0));
      break;
  }
  const key = kind as "attendance";
  if (!t.has(`${key}.title`)) return { title: t("unknown.title"), body: "" };
  return { title: t(`${key}.title`, values), body: t(`${key}.body`, values) };
}

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
      ...(await render(row.kind, (row.params ?? {}) as Params)),
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
