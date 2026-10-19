"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { saveLevels } from "@/features/setup/actions";
import { useRouter } from "@/i18n/navigation";
import { CYCLE_PRESETS, expandLevels, type CycleCode } from "@/lib/domain/senegal-presets";
import { cn } from "@/lib/utils";

type Serie = "L" | "S";
type Defaults = { cycles: CycleCode[]; series: Serie[]; francoArabic: boolean };

export function LevelsForm({ defaults, canEdit, nextHref }: { defaults: Defaults; canEdit: boolean; nextHref: string }) {
  const t = useTranslations("setup");
  const router = useRouter();
  const [cycles, setCycles] = useState<CycleCode[]>(defaults.cycles);
  const [series, setSeries] = useState<Serie[]>(defaults.series);
  const [francoArabic, setFrancoArabic] = useState(defaults.francoArabic);

  const form = useActionForm(saveLevels, {
    onSuccess: () => {
      toast.success(t("saved"));
      router.push(nextHref);
    },
  });

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  return (
    <form noValidate className="grid gap-6" action={() => form.run({ cycles, series, francoArabic })}>
      {!canEdit && <p className="rounded-xl bg-azure-50 px-4 py-3 text-sm text-azure-800">{t("readOnly")}</p>}

      <fieldset className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
        <legend className="sr-only">{t("levels.cyclesTitle")}</legend>
        <h2 className="text-base font-semibold" aria-hidden>
          {t("levels.cyclesTitle")}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {CYCLE_PRESETS.map((cycle) => {
            const checked = cycles.includes(cycle.code);
            const levels = expandLevels(cycle.code, cycle.code === "secondaire" ? series : undefined);
            return (
              <button
                key={cycle.code}
                type="button"
                role="checkbox"
                aria-checked={checked}
                disabled={!canEdit}
                onClick={() => setCycles((current) => toggle(current, cycle.code))}
                className={cn(
                  "flex items-start gap-3 rounded-xl p-4 text-left ring-1 ring-line transition-colors hover:bg-azure-50 disabled:cursor-not-allowed",
                  checked && "bg-azure-50 ring-2 ring-azure-400",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border border-input bg-white",
                    checked && "border-primary bg-primary text-white",
                  )}
                  aria-hidden
                >
                  {checked && <Check className="size-3.5" />}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">{cycle.label}</span>
                  <span className="block text-xs font-medium text-azure-700">{t(`levels.gradingScale.${cycle.gradingScale}`)}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {levels.map((level) => (level.series ? `${level.code} ${level.series}` : level.code)).join(" · ")}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <FieldError className="mt-3">{form.fieldError("cycles")}</FieldError>
      </fieldset>

      {cycles.includes("secondaire") && (
        <fieldset className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
          <legend className="sr-only">{t("levels.seriesTitle")}</legend>
          <h2 className="text-base font-semibold" aria-hidden>
            {t("levels.seriesTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("levels.seriesHint")}</p>
          <div className="mt-4 flex gap-3">
            {(["L", "S"] as const).map((serie) => {
              const checked = series.includes(serie);
              return (
                <button
                  key={serie}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  disabled={!canEdit}
                  onClick={() => setSeries((current) => toggle(current, serie))}
                  className={cn(
                    "flex h-12 w-24 items-center justify-center rounded-xl text-lg font-bold ring-1 ring-line transition-colors",
                    checked ? "bg-azure-200 text-ink ring-2 ring-azure-400" : "bg-white text-ink-soft hover:bg-azure-50",
                  )}
                >
                  {serie}
                </button>
              );
            })}
          </div>
          <FieldError className="mt-3">{form.fieldError("series")}</FieldError>
        </fieldset>
      )}

      <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
        <span>
          <span className="block text-base font-semibold text-ink">{t("levels.francoArabic")}</span>
          <span className="mt-1 block text-sm text-muted-foreground">{t("levels.francoArabicHint")}</span>
        </span>
        <Switch checked={francoArabic} onCheckedChange={setFrancoArabic} disabled={!canEdit} />
      </label>

      <FormAlert message={form.formError} />
      {canEdit && (
        <div>
          <Button type="submit" size="lg" disabled={form.pending}>
            {t("saveAndContinue")}
          </Button>
        </div>
      )}
    </form>
  );
}
