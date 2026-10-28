"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { saveAvailability } from "../actions";
import type { Availability } from "../availability";

const weekdayShort = (day: number) =>
  new Date(Date.UTC(2026, 10, 1 + day)).toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" });

/** Horaires de réponse du professeur, affichés aux parents qui lui écrivent. */
export function AvailabilityForm({ initial }: { initial: Availability }) {
  const t = useTranslations("messages.availability");
  const [days, setDays] = useState(new Set(initial.days));
  const [startsAt, setStartsAt] = useState(initial.startsAt);
  const [endsAt, setEndsAt] = useState(initial.endsAt);
  const form = useActionForm(saveAvailability, { onSuccess: () => toast.success(t("saved")) });

  return (
    <section aria-labelledby="availability" className="rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70">
      <h2 id="availability" className="text-base font-semibold">
        {t("title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("hint")}</p>
      <div role="group" aria-label={t("days")} className="mt-4 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
          const on = days.has(day);
          return (
            <button
              key={day}
              type="button"
              aria-pressed={on}
              onClick={() => {
                const next = new Set(days);
                if (on) next.delete(day);
                else next.add(day);
                setDays(next);
              }}
              className={cn(
                "h-10 min-w-12 rounded-full px-3 text-sm font-semibold capitalize ring-1",
                on ? "bg-azure-600 text-white ring-azure-600" : "bg-white text-ink-soft ring-line",
              )}
            >
              {weekdayShort(day)}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm font-medium">
          {t("from")}
          <Input type="time" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="w-32" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          {t("to")}
          <Input type="time" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="w-32" />
        </label>
        <Button type="button" disabled={form.pending} onClick={() => form.run({ days: [...days], startsAt, endsAt })}>
          {t("save")}
        </Button>
      </div>
      <FormAlert message={form.fieldError("days") ?? form.fieldError("endsAt") ?? form.formError} />
    </section>
  );
}
