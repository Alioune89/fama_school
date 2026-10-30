"use client";

import { MessageSquareText, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { useMessage } from "@/components/forms/use-action-form";
import { whatsappNumber } from "@/lib/domain/collections";
import { logReminder } from "../actions";
import type { ReminderChannel } from "../queries";

const link =
  "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold ring-1 ring-line hover:bg-azure-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

/**
 * Relance d'une famille : WhatsApp ou SMS avec le message prérempli, ou appel. Le lien s'ouvre sur l'appareil
 * de la personne qui relance ; la relance est notée en même temps.
 */
export function ReminderActions({
  studentId,
  studentName,
  overdue,
  phone,
  message,
}: {
  studentId: string;
  studentName: string;
  overdue: number;
  phone: string | null;
  message: string;
}) {
  const t = useTranslations("collections.reminders");
  const translate = useMessage();
  const number = whatsappNumber(phone);

  function log(channel: ReminderChannel) {
    void logReminder({ studentId, channel, overdueAmount: overdue }).then((result) => {
      if (result.ok) toast.success(t("logged"));
      else toast.error(translate(result.error));
    });
  }

  if (!number) return <p className="text-xs text-muted-foreground">{t("noPhone")}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noreferrer"
        onClick={() => log("whatsapp")}
        aria-label={t("whatsappFor", { name: studentName })}
        className={link}
      >
        <WhatsAppIcon className="size-4" />
        {t("whatsapp")}
      </a>
      <a
        href={`sms:+${number}?body=${encodeURIComponent(message)}`}
        onClick={() => log("sms")}
        aria-label={t("smsFor", { name: studentName })}
        className={link}
      >
        <MessageSquareText className="size-4 text-azure-700" aria-hidden />
        {t("sms")}
      </a>
      <a href={`tel:+${number}`} onClick={() => log("call")} aria-label={t("callFor", { name: studentName })} className={link}>
        <Phone className="size-4 text-ink-soft" aria-hidden />
        {t("call")}
      </a>
    </div>
  );
}
