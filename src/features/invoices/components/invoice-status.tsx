import { useTranslations } from "next-intl";
import { StatusPill, type StatusTone } from "@/components/dashboard/status-pill";
import type { InvoiceStatus } from "@/lib/domain/fees";

const TONES: Record<InvoiceStatus, StatusTone> = {
  open: "info",
  overdue: "danger",
  partial: "warning",
  paid: "success",
  cancelled: "neutral",
};

/** Statut d'une facture : libellé toujours écrit, couleur en complément. */
export function InvoiceStatusPill({ status }: { status: InvoiceStatus }) {
  const t = useTranslations("invoices.statuses");
  return <StatusPill tone={TONES[status]}>{t(status)}</StatusPill>;
}
