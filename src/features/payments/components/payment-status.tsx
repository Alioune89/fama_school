import { useTranslations } from "next-intl";
import { StatusPill, type StatusTone } from "@/components/dashboard/status-pill";
import type { Enums } from "@/lib/supabase/database.types";

const TONES: Record<Enums<"payment_status">, StatusTone> = {
  valid: "success",
  cancel_requested: "warning",
  cancelled: "neutral",
};

export function PaymentStatusPill({ status }: { status: Enums<"payment_status"> }) {
  const t = useTranslations("payments.statuses");
  return <StatusPill tone={TONES[status]}>{t(status)}</StatusPill>;
}
