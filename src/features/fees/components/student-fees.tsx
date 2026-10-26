"use client";

import { useTransition } from "react";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { submitForm, useActionForm, useMessage } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { annualFees } from "@/lib/domain/fees";
import { formatXOF } from "@/lib/format";
import { addDiscount, removeDiscount, setFeeOption } from "../actions";
import type { StudentFees as StudentFeesData } from "../queries";
import { DISCOUNT_KINDS } from "../schemas";

/** Frais de l'élève sur l'année : options choisies, réductions, détail et total annuel. */
export function StudentFees({ studentId, data, canEdit }: { studentId: string; data: StudentFeesData; canEdit: boolean }) {
  const t = useTranslations("fees.student");
  const tFees = useTranslations("fees");
  const message = useMessage();
  const [pending, startTransition] = useTransition();
  const form = useActionForm(addDiscount, { onSuccess: () => toast.success(t("discountAdded")) });

  const name = (feeTypeId: string | null) =>
    feeTypeId ? (data.feeTypes.find((f) => f.id === feeTypeId)?.name ?? "") : t("allMonthly");
  const options = new Set(data.options);
  const optionalFees = data.feeTypes.filter((fee) => fee.optional && data.rates[fee.id]);
  const { lines, total } = annualFees(
    data.feeTypes.map((fee) => ({
      feeTypeId: fee.id,
      amount: data.rates[fee.id] ?? 0,
      frequency: fee.frequency,
      optional: fee.optional,
    })),
    data.installments,
    options,
    data.discounts,
  );

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, success?: string) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(message(result.error));
      else if (success) toast.success(success);
    });

  return (
    <section aria-labelledby="student-fees" className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
      <h2 id="student-fees" className="text-lg font-semibold">
        {t("title")}
      </h2>

      {optionalFees.length > 0 && (
        <fieldset className="mt-3">
          <legend className="text-xs font-medium text-muted-foreground">{t("options")}</legend>
          <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-2">
            {optionalFees.map((fee) => (
              <label key={fee.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={options.has(fee.id)}
                  disabled={!canEdit || pending}
                  onCheckedChange={(checked) =>
                    run(() => setFeeOption({ studentId, yearId: data.yearId, feeTypeId: fee.id, enabled: checked === true }))
                  }
                />
                {fee.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="mt-4">
        <p className="text-xs font-medium text-muted-foreground">{t("discounts")}</p>
        {data.discounts.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">{t("noDiscount")}</p>
        ) : (
          <ul className="mt-1.5 space-y-1.5">
            {data.discounts.map((discount) => (
              <li key={discount.id} className="flex items-center gap-2 text-sm">
                <span className="rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-700">
                  −{discount.percent} %
                </span>
                <span className="min-w-0 flex-1">
                  {t(`discountKinds.${discount.kind}`)} · {name(discount.feeTypeId)}
                </span>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={pending}
                    aria-label={t("removeDiscount", { kind: t(`discountKinds.${discount.kind}`) })}
                    onClick={() => run(() => removeDiscount({ id: discount.id }), t("discountRemoved"))}
                  >
                    <X aria-hidden />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          // Remonté après chaque ajout (clé) : les champs repartent vides.
          <form
            key={data.discounts.length}
            onSubmit={submitForm((formData) => {
              form.run({
                studentId,
                yearId: data.yearId,
                kind: String(formData.get("kind")) as (typeof DISCOUNT_KINDS)[number],
                percent: String(formData.get("percent") ?? ""),
                feeTypeId: String(formData.get("feeTypeId") ?? ""),
              });
            })}
            noValidate
            className="mt-3 grid grid-cols-[1fr_5.5rem] gap-2 sm:grid-cols-[1fr_5.5rem_1fr_auto]"
          >
            <NativeSelect name="kind" aria-label={t("discountKind")} defaultValue="sibling">
              {DISCOUNT_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {t(`discountKinds.${kind}`)}
                </option>
              ))}
            </NativeSelect>
            <Input
              name="percent"
              inputMode="decimal"
              placeholder="%"
              aria-label={t("percent")}
              aria-invalid={form.hasError("percent") || undefined}
            />
            <NativeSelect name="feeTypeId" aria-label={t("appliesTo")} defaultValue="" className="col-span-2 sm:col-span-1">
              <option value="">{t("allMonthly")}</option>
              {data.feeTypes.map((fee) => (
                <option key={fee.id} value={fee.id}>
                  {fee.name}
                </option>
              ))}
            </NativeSelect>
            <Button type="submit" variant="outline" disabled={form.pending} className="col-span-2 sm:col-span-1">
              <Plus aria-hidden />
              {t("addDiscount")}
            </Button>
            <FieldError className="col-span-full">{form.fieldError("percent") ?? form.fieldError("feeTypeId")}</FieldError>
            <div className="col-span-full empty:hidden">
              <FormAlert message={form.formError} />
            </div>
          </form>
        )}
      </div>

      <div className="mt-5 border-t border-line pt-4">
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noRates")}</p>
        ) : (
          <dl className="space-y-1.5 text-sm">
            {lines.map((line) => (
              <div key={line.feeTypeId} className="flex justify-between gap-3">
                <dt className="text-ink-soft">
                  {name(line.feeTypeId)}
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    ·{" "}
                    {line.occurrences > 1
                      ? t("perMonth", { amount: formatXOF(line.amount), count: line.occurrences })
                      : tFees("frequencies.once")}
                    {line.discountPercent > 0 && ` · −${line.discountPercent} %`}
                  </span>
                </dt>
                <dd className="tabular font-medium whitespace-nowrap text-ink">{formatXOF(line.total)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-3 border-t border-line pt-2 font-semibold">
              <dt>{t("total")}</dt>
              <dd className="tabular whitespace-nowrap">{formatXOF(total)}</dd>
            </div>
          </dl>
        )}
      </div>
    </section>
  );
}
