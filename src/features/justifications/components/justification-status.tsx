import { getTranslations } from "next-intl/server";
import { StatusPill, type StatusTone } from "@/components/dashboard/status-pill";
import { formatDate } from "@/lib/format";
import type { JustificationStatus } from "../schemas";

export const STATUS_TONE: Record<JustificationStatus, StatusTone> = {
  pending: "info",
  accepted: "success",
  refused: "danger",
};

/** Décision sur un justificatif : point coloré + libellé. */
export async function JustificationStatusPill({ status }: { status: JustificationStatus }) {
  const t = await getTranslations("justifications.statuses");
  return <StatusPill tone={STATUS_TONE[status]}>{t(status)}</StatusPill>;
}

/** « mardi 21 octobre », ou « du lundi 20 octobre au mercredi 22 octobre ». */
export async function formatPeriod(from: string, to: string) {
  const t = await getTranslations("justifications");
  const day = (date: string) => formatDate(date, { weekday: "long", day: "numeric", month: "long" });
  return from === to ? day(from) : t("period", { from: day(from), to: day(to) });
}
