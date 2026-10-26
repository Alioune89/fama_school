"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { submitForm, useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { formatInteger, formatXOF } from "@/lib/format";
import { cn } from "@/lib/utils";
import { recordPayment } from "../actions";
import { COUNTER_METHODS } from "../methods";

type DueInvoice = { id: string; number: string; label: string; remaining: number };

/**
 * Encaissement au guichet : factures dues de l'élève (toutes cochées), montant (le total choisi par défaut,
 * modifiable pour un paiement partiel), moyen de paiement et référence. Ouvre ensuite le reçu.
 */
export function RecordPaymentForm({ studentId, invoices }: { studentId: string; invoices: DueInvoice[] }) {
  const t = useTranslations("payments");
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(invoices.map((invoice) => invoice.id)));
  const selectedDue = invoices.filter((invoice) => selected.has(invoice.id)).reduce((sum, invoice) => sum + invoice.remaining, 0);
  const [amount, setAmount] = useState(formatInteger(selectedDue));
  const [method, setMethod] = useState<(typeof COUNTER_METHODS)[number]>("cash");
  const form = useActionForm(recordPayment, {
    onSuccess: ({ id }) => {
      toast.success(t("recordedShort"));
      router.push(`/direction/finances/encaissements/${id}`);
    },
  });

  function toggle(id: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
    setAmount(
      formatInteger(invoices.filter((invoice) => next.has(invoice.id)).reduce((sum, invoice) => sum + invoice.remaining, 0)),
    );
  }

  return (
    <form
      onSubmit={submitForm((formData) =>
        form.run({
          studentId,
          amount,
          method,
          reference: String(formData.get("reference") ?? ""),
          note: String(formData.get("note") ?? ""),
          invoiceIds: [...selected],
        }),
      )}
      noValidate
      className="space-y-5"
    >
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("dueInvoices")}</legend>
        <ul className="space-y-2">
          {invoices.map((invoice) => (
            <li key={invoice.id}>
              <label className="flex items-center gap-3 rounded-lg px-3 py-2 ring-1 ring-line hover:bg-muted/50">
                <Checkbox
                  checked={selected.has(invoice.id)}
                  onCheckedChange={(checked) => toggle(invoice.id, checked === true)}
                />
                <span className="min-w-0 flex-1 text-sm">
                  {t("invoiceDue", { label: invoice.label, amount: formatXOF(invoice.remaining) })}
                  <span className="block text-xs text-muted-foreground">{invoice.number}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm font-medium text-ink-soft">{t("selectedDue", { amount: formatXOF(selectedDue) })}</p>
        <FieldError>{form.fieldError("invoiceIds")}</FieldError>
      </fieldset>

      <Field data-invalid={form.hasError("amount") || undefined}>
        <FieldLabel htmlFor="payment-amount">{t("amount")}</FieldLabel>
        <Input
          id="payment-amount"
          inputMode="numeric"
          autoComplete="off"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-invalid={form.hasError("amount") || undefined}
          className="tabular h-12 text-lg font-semibold"
        />
        <FieldDescription>{t("amountHint")}</FieldDescription>
        <FieldError>{form.fieldError("amount")}</FieldError>
      </Field>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("method")}</legend>
        <div role="radiogroup" aria-label={t("method")} className="flex flex-wrap gap-2">
          {COUNTER_METHODS.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={method === value}
              onClick={() => setMethod(value)}
              className={cn(
                "h-10 rounded-full px-4 text-sm font-semibold ring-1",
                method === value ? "bg-azure-100 text-ink ring-azure-500" : "bg-white text-ink-soft ring-line hover:text-ink",
              )}
            >
              {t(`methods.${value}`)}
            </button>
          ))}
        </div>
      </fieldset>

      {method !== "cash" && (
        <Field>
          <FieldLabel htmlFor="payment-reference">{t("reference")}</FieldLabel>
          <Input
            id="payment-reference"
            name="reference"
            maxLength={80}
            autoComplete="off"
            placeholder={t("referencePlaceholder")}
          />
        </Field>
      )}
      <Field>
        <FieldLabel htmlFor="payment-note">{t("note")}</FieldLabel>
        <Input id="payment-note" name="note" maxLength={200} autoComplete="off" />
      </Field>

      <FormAlert message={form.formError} />
      <Button type="submit" size="touch" className="w-full sm:w-auto" disabled={form.pending || selected.size === 0}>
        {t("submit")}
      </Button>
    </form>
  );
}
