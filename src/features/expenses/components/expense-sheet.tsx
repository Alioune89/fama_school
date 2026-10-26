"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { submitForm, useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Constants } from "@/lib/supabase/database.types";
import { COUNTER_METHODS } from "../../payments/methods";
import { addExpense } from "../actions";

/** Saisie d'une dépense : date, catégorie, libellé, montant, moyen de paiement. */
export function ExpenseSheet({ today }: { today: string }) {
  const t = useTranslations("expenses");
  const tMethods = useTranslations("payments.methods");
  const [open, setOpen] = useState(false);
  const form = useActionForm(addExpense, {
    onSuccess: () => {
      toast.success(t("added"));
      setOpen(false);
    },
  });
  const field = (name: string) => ({ id: `expense-${name}`, name, "aria-invalid": form.hasError(name) || undefined });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button>
            <Plus aria-hidden />
            {t("new")}
          </Button>
        }
      />
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-line px-6 py-5">
          <SheetTitle className="text-lg font-bold">{t("new")}</SheetTitle>
          <SheetDescription>{t("newHint")}</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={submitForm((formData) =>
            form.run({
              spentOn: String(formData.get("spentOn") ?? ""),
              category: String(formData.get("category") ?? "") as (typeof Constants.public.Enums.expense_category)[number],
              label: String(formData.get("label") ?? ""),
              amount: String(formData.get("amount") ?? ""),
              method: String(formData.get("method") ?? "cash") as (typeof Constants.public.Enums.payment_method)[number],
              reference: String(formData.get("reference") ?? ""),
            }),
          )}
          noValidate
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5"
        >
          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={form.hasError("spentOn") || undefined}>
              <FieldLabel htmlFor="expense-spentOn">{t("date")}</FieldLabel>
              <Input {...field("spentOn")} type="date" defaultValue={today} max={today} />
              <FieldError>{form.fieldError("spentOn")}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="expense-category">{t("category")}</FieldLabel>
              <NativeSelect id="expense-category" name="category" defaultValue="supplies">
                {Constants.public.Enums.expense_category.map((category) => (
                  <option key={category} value={category}>
                    {t(`categories.${category}`)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field data-invalid={form.hasError("label") || undefined}>
            <FieldLabel htmlFor="expense-label">{t("label")}</FieldLabel>
            <Input {...field("label")} maxLength={120} placeholder={t("labelPlaceholder")} autoComplete="off" />
            <FieldError>{form.fieldError("label")}</FieldError>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={form.hasError("amount") || undefined}>
              <FieldLabel htmlFor="expense-amount">{t("amount")}</FieldLabel>
              <Input {...field("amount")} inputMode="numeric" autoComplete="off" className="tabular" />
              <FieldError>{form.fieldError("amount")}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="expense-method">{t("method")}</FieldLabel>
              <NativeSelect id="expense-method" name="method" defaultValue="cash">
                {COUNTER_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {tMethods(method)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="expense-reference">{t("reference")}</FieldLabel>
            <Input id="expense-reference" name="reference" maxLength={80} autoComplete="off" />
          </Field>
          <FormAlert message={form.formError} />
          <div className="mt-auto flex gap-3 pt-2">
            <Button type="submit" size="lg" className="flex-1" disabled={form.pending}>
              {t("save")}
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
