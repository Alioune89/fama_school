"use client";

import { useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { submitForm, useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Enums } from "@/lib/supabase/database.types";
import { createEvaluation, updateEvaluation } from "../actions";
import type { Evaluation, Period } from "../queries";
import { EVALUATION_KINDS, type EvaluationKind } from "../schemas";

type Props = {
  classId: string;
  subjectId: string;
  /** « 6e A · Français », en tête du formulaire. */
  context: string;
  scale: Enums<"grading_scale">;
  periods: Period[];
  periodId: string;
  /** Évaluation modifiée ; absente pour une création. */
  evaluation?: Evaluation;
  trigger: ReactElement;
};

const SCALE_MAX = { ten: 10, twenty: 20 } as const;

/** Création ou modification d'un devoir, d'une interrogation ou d'une composition. */
export function EvaluationFormSheet({ classId, subjectId, context, scale, periods, periodId, evaluation, trigger }: Props) {
  const t = useTranslations("evaluations");
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<EvaluationKind>(evaluation?.kind ?? "devoir");
  const [selectedPeriod, setSelectedPeriod] = useState(evaluation?.periodId ?? periodId);
  const period = periods.find((p) => p.id === selectedPeriod);
  const onSuccess = () => {
    toast.success(t(evaluation ? "updated" : "created"));
    setOpen(false);
  };
  const create = useActionForm(createEvaluation, { onSuccess });
  const update = useActionForm(updateEvaluation, { onSuccess });
  const form = evaluation ? update : create;
  const field = (name: string) => ({ id: `evaluation-${name}`, name, "aria-invalid": form.hasError(name) || undefined });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-line px-6 py-5">
          <SheetTitle className="text-lg font-bold">{t(evaluation ? "editTitle" : "newTitle")}</SheetTitle>
          <SheetDescription>{context}</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={submitForm((formData) => {
            const values = {
              periodId: selectedPeriod,
              kind,
              title: String(formData.get("title") ?? ""),
              heldOn: String(formData.get("heldOn") ?? ""),
              maxScore: scale === "appreciation" ? "" : String(formData.get("maxScore") ?? ""),
              weight: String(formData.get("weight") ?? "1"),
            };
            if (evaluation) update.run({ id: evaluation.id, ...values });
            else create.run({ classId, subjectId, ...values });
          })}
          noValidate
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5"
        >
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t("kind")}</legend>
            <div role="radiogroup" aria-label={t("kind")} className="flex flex-wrap gap-2">
              {EVALUATION_KINDS.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={kind === value}
                  onClick={() => setKind(value)}
                  className={
                    kind === value
                      ? "h-10 rounded-full bg-azure-100 px-4 text-sm font-semibold text-ink ring-1 ring-azure-500"
                      : "h-10 rounded-full bg-white px-4 text-sm font-semibold text-ink-soft ring-1 ring-line hover:text-ink"
                  }
                >
                  {t(`kinds.${value}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <Field data-invalid={form.hasError("title") || undefined}>
            <FieldLabel htmlFor="evaluation-title">{t("titleLabel")}</FieldLabel>
            <Input
              {...field("title")}
              defaultValue={evaluation?.title ?? ""}
              placeholder={t(`titlePlaceholder.${kind}`)}
              maxLength={80}
              required
              autoComplete="off"
            />
            <FieldError>{form.fieldError("title")}</FieldError>
          </Field>

          {periods.length > 1 && (
            <Field>
              <FieldLabel htmlFor="evaluation-period">{t("period")}</FieldLabel>
              <NativeSelect
                id="evaluation-period"
                value={selectedPeriod}
                onChange={(event) => setSelectedPeriod(event.target.value)}
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.locked}>
                    {p.locked ? t("periodLocked", { label: p.label }) : p.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}

          <Field data-invalid={form.hasError("heldOn") || undefined}>
            <FieldLabel htmlFor="evaluation-heldOn">{t("heldOn")}</FieldLabel>
            <Input
              {...field("heldOn")}
              type="date"
              defaultValue={evaluation?.heldOn ?? ""}
              min={period?.startsOn}
              max={period?.endsOn}
              required
            />
            <FieldError>{form.fieldError("heldOn")}</FieldError>
          </Field>

          <div className="grid grid-cols-2 gap-5">
            {scale !== "appreciation" && (
              <Field data-invalid={form.hasError("maxScore") || undefined}>
                <FieldLabel htmlFor="evaluation-maxScore">{t("maxScore")}</FieldLabel>
                <Input
                  {...field("maxScore")}
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={100}
                  step="0.5"
                  defaultValue={evaluation?.maxScore ?? SCALE_MAX[scale]}
                />
                <FieldDescription>{t("maxScoreHint", { max: SCALE_MAX[scale] })}</FieldDescription>
                <FieldError>{form.fieldError("maxScore")}</FieldError>
              </Field>
            )}
            <Field data-invalid={form.hasError("weight") || undefined}>
              <FieldLabel htmlFor="evaluation-weight">{t("weight")}</FieldLabel>
              <Input
                {...field("weight")}
                type="number"
                inputMode="decimal"
                min={0.5}
                max={10}
                step="0.5"
                defaultValue={evaluation?.weight ?? 1}
              />
              <FieldDescription>{t("weightHint")}</FieldDescription>
              <FieldError>{form.fieldError("weight")}</FieldError>
            </Field>
          </div>

          <FormAlert message={form.formError} />
          <div className="mt-auto flex gap-3 pt-2">
            <Button type="submit" size="lg" className="flex-1" disabled={form.pending}>
              {t(evaluation ? "save" : "create")}
            </Button>
            <Button type="button" size="lg" variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
