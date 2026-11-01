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
import { recordSubscriptionPayment, setSubscriptionEnd } from "../actions";
import { SUBSCRIPTION_METHODS } from "../schemas";

/** Fin de la période couverte, fixée à la main (fin du pilote, geste commercial). */
export function SubscriptionEndForm({ schoolId, endsOn }: { schoolId: string; endsOn: string | null }) {
  const t = useTranslations("platform.subscription");
  const [value, setValue] = useState(endsOn ?? "");
  const form = useActionForm(setSubscriptionEnd, { onSuccess: () => toast.success(t("endSaved")) });

  return (
    <form noValidate className="space-y-2" onSubmit={submitForm(() => form.run({ schoolId, endsOn: value }))}>
      <Field data-invalid={form.hasError("endsOn") || undefined}>
        <FieldLabel htmlFor="subscription-end">{t("endsOn")}</FieldLabel>
        <div className="flex flex-wrap gap-2">
          <Input
            id="subscription-end"
            type="date"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="w-48"
          />
          <Button type="submit" variant="outline" disabled={form.pending || value === (endsOn ?? "")}>
            {t("saveEnd")}
          </Button>
        </div>
        <FieldError>{form.fieldError("endsOn")}</FieldError>
      </Field>
      <FormAlert message={form.formError} />
    </form>
  );
}

/** Paiement d'abonnement reçu d'une école : il prolonge l'abonnement jusqu'à la période couverte. */
export function SubscriptionPaymentForm({
  schoolId,
  monthly,
  today,
  coversUntil,
}: {
  schoolId: string;
  /** Prix mensuel de la formule (null : pilote ou sur devis). */
  monthly: number | null;
  today: string;
  /** Fin de période proposée. */
  coversUntil: string;
}) {
  const t = useTranslations("platform.subscription");
  const [open, setOpen] = useState(false);
  const form = useActionForm(recordSubscriptionPayment, {
    onSuccess: () => {
      toast.success(t("paymentSaved"));
      setOpen(false);
    },
  });

  if (!open) {
    return (
      <Button type="button" variant="sun" size="sm" onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        {t("addPayment")}
      </Button>
    );
  }

  const fields = [
    { name: "amount", type: "number", defaultValue: monthly ? String(monthly) : "", inputMode: "numeric" },
    { name: "paidOn", type: "date", defaultValue: today },
    { name: "coversUntil", type: "date", defaultValue: coversUntil },
    { name: "reference", type: "text", defaultValue: "" },
  ] as const;

  return (
    <form
      noValidate
      aria-label={t("addPayment")}
      className="space-y-4 rounded-xl bg-azure-50/60 p-4 ring-1 ring-line"
      onSubmit={submitForm((data) =>
        form.run({
          schoolId,
          amount: String(data.get("amount") ?? ""),
          method: String(data.get("method") ?? "") as (typeof SUBSCRIPTION_METHODS)[number],
          paidOn: String(data.get("paidOn") ?? ""),
          coversUntil: String(data.get("coversUntil") ?? ""),
          reference: String(data.get("reference") ?? ""),
        }),
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(({ name, ...props }) => (
          <Field key={name} data-invalid={form.hasError(name) || undefined}>
            <FieldLabel htmlFor={`subscription-${name}`}>{t(`fields.${name}`)}</FieldLabel>
            <Input id={`subscription-${name}`} name={name} {...props} />
            <FieldError>{form.fieldError(name)}</FieldError>
          </Field>
        ))}
        <Field data-invalid={form.hasError("method") || undefined}>
          <FieldLabel htmlFor="subscription-method">{t("fields.method")}</FieldLabel>
          <NativeSelect id="subscription-method" name="method" defaultValue="wave">
            {SUBSCRIPTION_METHODS.map((method) => (
              <option key={method} value={method}>
                {t(`methods.${method}`)}
              </option>
            ))}
          </NativeSelect>
          <FieldError>{form.fieldError("method")}</FieldError>
        </Field>
      </div>
      <FormAlert message={form.formError} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={form.pending}>
          {t("savePayment")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={form.pending}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
