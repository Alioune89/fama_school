"use client";

import { useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { submitForm, useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Enums } from "@/lib/supabase/database.types";
import { saveFeeType } from "../actions";
import type { FeeType } from "../queries";
import { FEE_FREQUENCIES, FEE_KINDS } from "../schemas";

/** Frais facturés au mois par défaut, et frais optionnels par défaut, selon leur nature. */
const MONTHLY_KINDS = new Set<Enums<"fee_kind">>(["tuition", "canteen", "transport"]);
const OPTIONAL_KINDS = new Set<Enums<"fee_kind">>(["canteen", "transport", "uniform"]);

/** Création ou modification d'un type de frais. */
export function FeeTypeSheet({ feeType, trigger }: { feeType?: FeeType; trigger: ReactElement }) {
  const t = useTranslations("fees");
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Enums<"fee_kind">>(feeType?.kind ?? "tuition");
  const [frequency, setFrequency] = useState<Enums<"fee_frequency">>(feeType?.frequency ?? "monthly");
  const [optional, setOptional] = useState(feeType?.optional ?? false);
  const form = useActionForm(saveFeeType, {
    onSuccess: () => {
      toast.success(t(feeType ? "typeUpdated" : "typeCreated"));
      setOpen(false);
    },
  });

  function chooseKind(value: Enums<"fee_kind">) {
    setKind(value);
    if (feeType) return;
    setFrequency(MONTHLY_KINDS.has(value) ? "monthly" : "once");
    setOptional(OPTIONAL_KINDS.has(value));
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-line px-6 py-5">
          <SheetTitle className="text-lg font-bold">{t(feeType ? "editType" : "newType")}</SheetTitle>
          <SheetDescription>{t("typeHint")}</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={submitForm((formData) =>
            form.run({ id: feeType?.id, name: String(formData.get("name") ?? ""), kind, frequency, optional }),
          )}
          noValidate
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5"
        >
          <Field>
            <FieldLabel htmlFor="fee-kind">{t("kind")}</FieldLabel>
            <NativeSelect id="fee-kind" value={kind} onChange={(event) => chooseKind(event.target.value as Enums<"fee_kind">)}>
              {FEE_KINDS.map((value) => (
                <option key={value} value={value}>
                  {t(`kinds.${value}`)}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field data-invalid={form.hasError("name") || undefined}>
            <FieldLabel htmlFor="fee-name">{t("name")}</FieldLabel>
            <Input
              id="fee-name"
              name="name"
              aria-invalid={form.hasError("name") || undefined}
              defaultValue={feeType?.name ?? ""}
              placeholder={t(`kinds.${kind}`)}
              maxLength={60}
              required
              autoComplete="off"
            />
            <FieldError>{form.fieldError("name")}</FieldError>
          </Field>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t("frequency")}</legend>
            <div role="radiogroup" aria-label={t("frequency")} className="flex flex-wrap gap-2">
              {FEE_FREQUENCIES.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={frequency === value}
                  onClick={() => setFrequency(value)}
                  className={
                    frequency === value
                      ? "h-10 rounded-full bg-azure-100 px-4 text-sm font-semibold text-ink ring-1 ring-azure-500"
                      : "h-10 rounded-full bg-white px-4 text-sm font-semibold text-ink-soft ring-1 ring-line hover:text-ink"
                  }
                >
                  {t(`frequencies.${value}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <Field>
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox checked={optional} onCheckedChange={(checked) => setOptional(checked === true)} />
              {t("optional")}
            </label>
            <FieldDescription>{t("optionalHint")}</FieldDescription>
          </Field>

          <FormAlert message={form.formError} />
          <div className="mt-auto flex gap-3 pt-2">
            <Button type="submit" size="lg" className="flex-1" disabled={form.pending}>
              {t(feeType ? "save" : "create")}
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
