"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { saveEvaluationSettings } from "@/features/setup/actions";
import { useRouter } from "@/i18n/navigation";
import type { MentionThresholds } from "@/lib/domain/school-settings";

type Weights = { devoir: number; interrogation: number; composition: number };
type Defaults = { mentionThresholds: { twenty: MentionThresholds; ten: MentionThresholds }; evaluationWeights: Weights };

const MENTIONS = ["felicitations", "encouragements", "tableauHonneur"] as const;
const KINDS = ["devoir", "interrogation", "composition"] as const;

function NumberCell({
  id,
  label,
  value,
  onChange,
  max,
  disabled,
  suffix,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  max: number;
  disabled: boolean;
  suffix?: string;
}) {
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-4 py-3">
      <span className="text-sm font-medium text-ink">{label}</span>
      <span className="flex items-center gap-1.5">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          max={max}
          step={0.5}
          value={Number.isFinite(value) ? value : ""}
          onChange={(event) => onChange(Number(event.target.value.replace(",", ".")))}
          disabled={disabled}
          className="tabular h-10 w-20 rounded-lg border border-line bg-white text-center font-semibold text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </span>
    </label>
  );
}

export function EvaluationForm({ defaults, canEdit, nextHref }: { defaults: Defaults; canEdit: boolean; nextHref: string }) {
  const t = useTranslations("setup");
  const router = useRouter();
  const [thresholds, setThresholds] = useState(defaults.mentionThresholds);
  const [weights, setWeights] = useState<Weights>(defaults.evaluationWeights);

  const form = useActionForm(saveEvaluationSettings, {
    onSuccess: () => {
      toast.success(t("saved"));
      router.push(nextHref);
    },
  });

  const totalWeight = weights.devoir + weights.interrogation + weights.composition;
  const example = totalWeight > 0 ? (12 * weights.devoir + 14 * weights.interrogation + 10 * weights.composition) / totalWeight : null;

  return (
    <form noValidate className="grid gap-6 xl:grid-cols-2" action={() => form.run({ mentionThresholds: thresholds, evaluationWeights: weights })}>
      {!canEdit && <p className="rounded-xl bg-azure-50 px-4 py-3 text-sm text-azure-800 xl:col-span-2">{t("readOnly")}</p>}

      <section className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
        <h2 className="text-base font-semibold">{t("evaluation.thresholdsTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("evaluation.thresholdsHint")}</p>
        {(["twenty", "ten"] as const).map((scale) => (
          <fieldset key={scale} className="mt-5">
            <legend className="text-sm font-semibold text-azure-700">{t(`evaluation.${scale}`)}</legend>
            <div className="mt-2 grid gap-2">
              {MENTIONS.map((mention) => (
                <NumberCell
                  key={mention}
                  id={`${scale}-${mention}`}
                  label={t(`evaluation.${mention}`)}
                  value={thresholds[scale][mention]}
                  max={scale === "twenty" ? 20 : 10}
                  suffix={scale === "twenty" ? "/ 20" : "/ 10"}
                  disabled={!canEdit}
                  onChange={(value) => setThresholds((current) => ({ ...current, [scale]: { ...current[scale], [mention]: value } }))}
                />
              ))}
            </div>
            <FieldError className="mt-2">{form.fieldError(`mentionThresholds.${scale}`)}</FieldError>
          </fieldset>
        ))}
      </section>

      <section className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
        <h2 className="text-base font-semibold">{t("evaluation.weightsTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("evaluation.weightsHint")}</p>
        <div className="mt-5 grid gap-2">
          {KINDS.map((kind) => (
            <NumberCell
              key={kind}
              id={`weight-${kind}`}
              label={t(`evaluation.${kind}`)}
              value={weights[kind]}
              max={10}
              disabled={!canEdit}
              onChange={(value) => setWeights((current) => ({ ...current, [kind]: value }))}
            />
          ))}
        </div>
        <FieldError className="mt-2">{form.fieldError("evaluationWeights")}</FieldError>
        {example !== null && (
          <p className="mt-5 rounded-xl bg-lavender-50 px-4 py-3 text-sm text-lavender-700">
            {t("evaluation.example", { average: example.toLocaleString("fr-SN", { maximumFractionDigits: 2 }) })}
          </p>
        )}
      </section>

      <div className="xl:col-span-2">
        <FormAlert message={form.formError} />
      </div>
      {canEdit && (
        <div className="xl:col-span-2">
          <Button type="submit" size="lg" disabled={form.pending}>
            {t("save")}
          </Button>
        </div>
      )}
    </form>
  );
}
