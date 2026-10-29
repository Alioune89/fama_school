import "server-only";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { formatDate, formatXOF } from "@/lib/format";

export type NotificationParams = Record<string, string | number | null | undefined>;

/**
 * Rédige une notification à partir de son type et de ses paramètres : dans la langue de la page, ou dans
 * `locale` hors requête (envoi par SMS ou WhatsApp).
 */
export async function renderNotification(
  kind: string,
  params: NotificationParams,
  locale?: Locale,
): Promise<{ title: string; body: string }> {
  const [t, tAttendance, tReports] = await Promise.all([
    getTranslations({ locale: locale ?? (await getLocale()), namespace: "notifications.kinds" }),
    getTranslations({ locale: locale ?? (await getLocale()), namespace: "attendance" }),
    getTranslations({ locale: locale ?? (await getLocale()), namespace: "reports.categories" }),
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
    case "homework":
      values.dueOn = values.dueOn ? formatDate(values.dueOn, { weekday: "long", day: "numeric", month: "long" }) : "";
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
