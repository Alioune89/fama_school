"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { saveAcademicYear } from "@/features/setup/actions";
import { useRouter } from "@/i18n/navigation";
import { buildPeriods, parseYearLabel, type PeriodDraft, type PeriodKind } from "@/lib/domain/academic-calendar";
import { cn } from "@/lib/utils";

type Defaults = { label: string; startsOn: string; endsOn: string; periodKind: PeriodKind; periods: PeriodDraft[] };

export function AcademicYearForm({
  defaults,
  canEdit,
  nextHref,
  locked,
}: {
  defaults: Defaults;
  canEdit: boolean;
  nextHref: string;
  locked: boolean;
}) {
  const t = useTranslations("setup");
  const router = useRouter();
  const editable = canEdit && !locked;
  const [label, setLabel] = useState(defaults.label);
  const [startsOn, setStartsOn] = useState(defaults.startsOn);
  const [endsOn, setEndsOn] = useState(defaults.endsOn);
  const [periodKind, setPeriodKind] = useState<PeriodKind>(defaults.periodKind);
  const [periods, setPeriods] = useState<PeriodDraft[]>(defaults.periods);

  const form = useActionForm(saveAcademicYear, {
    onSuccess: () => {
      toast.success(t("saved"));
      router.push(nextHref);
    },
  });

  const recompute = (next: { label?: string; startsOn?: string; endsOn?: string; kind?: PeriodKind }) => {
    const draft = { label: next.label ?? label, startsOn: next.startsOn ?? startsOn, endsOn: next.endsOn ?? endsOn };
    if (parseYearLabel(draft.label) && draft.startsOn && draft.endsOn) setPeriods(buildPeriods(draft, next.kind ?? periodKind));
  };

  const updatePeriod = (index: number, patch: Partial<PeriodDraft>) =>
    setPeriods((current) => current.map((period, i) => (i === index ? { ...period, ...patch } : period)));

  return (
    <form
      noValidate
      className="grid gap-6"
      action={() => form.run({ label, startsOn, endsOn, periodKind, periods })}
    >
      {!canEdit && <p className="rounded-xl bg-azure-50 px-4 py-3 text-sm text-azure-800">{t("readOnly")}</p>}
      {locked && <FormAlert message={t("errors.periodLocked")} />}

      <section className="grid gap-5 rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70 sm:grid-cols-3">
        <Field data-invalid={form.hasError("label") || undefined}>
          <FieldLabel htmlFor="label">{t("year.label")}</FieldLabel>
          <Input
            id="label"
            value={label}
            disabled={!editable}
            inputMode="numeric"
            onChange={(event) => setLabel(event.target.value)}
            onBlur={() => recompute({})}
            aria-invalid={form.hasError("label") || undefined}
          />
          <FieldError>{form.fieldError("label")}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="startsOn">{t("year.startsOn")}</FieldLabel>
          <Input
            id="startsOn"
            type="date"
            value={startsOn}
            disabled={!editable}
            onChange={(event) => {
              setStartsOn(event.target.value);
              recompute({ startsOn: event.target.value });
            }}
          />
        </Field>
        <Field data-invalid={form.hasError("endsOn") || undefined}>
          <FieldLabel htmlFor="endsOn">{t("year.endsOn")}</FieldLabel>
          <Input
            id="endsOn"
            type="date"
            value={endsOn}
            disabled={!editable}
            onChange={(event) => {
              setEndsOn(event.target.value);
              recompute({ endsOn: event.target.value });
            }}
            aria-invalid={form.hasError("endsOn") || undefined}
          />
          <FieldError>{form.fieldError("endsOn")}</FieldError>
        </Field>

        <fieldset className="sm:col-span-3">
          <legend className="text-sm font-medium text-ink">{t("year.periodKind")}</legend>
          <div className="mt-2 inline-grid grid-cols-2 gap-1 rounded-full bg-muted p-1" role="radiogroup">
            {(["semester", "trimester"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                role="radio"
                aria-checked={periodKind === kind}
                disabled={!editable}
                onClick={() => {
                  setPeriodKind(kind);
                  recompute({ kind });
                }}
                className={cn(
                  "h-10 rounded-full px-5 text-sm font-semibold text-ink-soft transition-colors disabled:cursor-not-allowed",
                  periodKind === kind && "bg-white text-ink shadow-card",
                )}
              >
                {t(`year.${kind}`)}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{t("year.periodsTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("year.periodsHint")}</p>
          </div>
          {editable && (
            <Button type="button" variant="ghost" size="sm" onClick={() => recompute({})}>
              <RefreshCw aria-hidden />
              {t("year.regenerate")}
            </Button>
          )}
        </div>
        <ul className="mt-5 space-y-3">
          {periods.map((period, index) => (
            <li key={period.position} className="grid gap-3 rounded-xl bg-canvas p-4 sm:grid-cols-[1.4fr_1fr_1fr]">
              <Field>
                <FieldLabel htmlFor={`period-${index}-label`}>{t("year.periodLabel")}</FieldLabel>
                <Input
                  id={`period-${index}-label`}
                  value={period.label}
                  disabled={!editable}
                  onChange={(event) => updatePeriod(index, { label: event.target.value })}
                />
              </Field>
              <Field data-invalid={form.hasError(`periods.${index}.startsOn`) || undefined}>
                <FieldLabel htmlFor={`period-${index}-start`}>{t("year.from")}</FieldLabel>
                <Input
                  id={`period-${index}-start`}
                  type="date"
                  value={period.startsOn}
                  disabled={!editable}
                  onChange={(event) => updatePeriod(index, { startsOn: event.target.value })}
                  aria-invalid={form.hasError(`periods.${index}.startsOn`) || undefined}
                />
                <FieldError>{form.fieldError(`periods.${index}.startsOn`)}</FieldError>
              </Field>
              <Field data-invalid={form.hasError(`periods.${index}.endsOn`) || undefined}>
                <FieldLabel htmlFor={`period-${index}-end`}>{t("year.to")}</FieldLabel>
                <Input
                  id={`period-${index}-end`}
                  type="date"
                  value={period.endsOn}
                  disabled={!editable}
                  onChange={(event) => updatePeriod(index, { endsOn: event.target.value })}
                  aria-invalid={form.hasError(`periods.${index}.endsOn`) || undefined}
                />
                <FieldError>{form.fieldError(`periods.${index}.endsOn`)}</FieldError>
              </Field>
            </li>
          ))}
        </ul>
        <FieldError className="mt-3">{form.fieldError("periods")}</FieldError>
      </section>

      <FormAlert message={form.formError} />
      {editable && (
        <div>
          <Button type="submit" size="lg" disabled={form.pending}>
            {t("saveAndContinue")}
          </Button>
        </div>
      )}
    </form>
  );
}
