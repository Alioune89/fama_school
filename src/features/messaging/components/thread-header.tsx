"use client";

import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { isAvailableNow, type Availability } from "../availability";
import { useAvailabilityText } from "./use-availability-text";

/** En-tête d'une conversation : sujet, interlocuteur, enfant ; horaires du professeur pour le parent. */
export function ThreadHeader({
  subject,
  counterpart,
  studentName,
  availability,
}: {
  subject: string;
  counterpart: string;
  studentName: string;
  availability: Availability | null;
}) {
  const t = useTranslations("messages");
  const availabilityText = useAvailabilityText();
  return (
    <header className="mb-5">
      <h1 className="text-2xl font-bold">{subject}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("with", { name: counterpart, child: studentName })}</p>
      {availability && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ink-soft">
          <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            {availabilityText(availability)}
            {!isAvailableNow(availability) && ` ${t("availability.later")}`}
          </span>
        </p>
      )}
    </header>
  );
}
