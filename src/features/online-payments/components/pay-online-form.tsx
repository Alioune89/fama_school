"use client";

import { useState } from "react";
import { Smartphone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate, formatXOF } from "@/lib/format";
import { startOnlinePayment } from "../actions";

type DueInvoice = { id: string; number: string; label: string; dueOn: string; remaining: number };

/** Factures dues d'un enfant (toutes cochées) et paiement en ligne de leur reste dû. */
export function PayOnlineForm({ studentId, invoices }: { studentId: string; invoices: DueInvoice[] }) {
  const t = useTranslations("onlinePayments");
  const locale = useLocale();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(invoices.map((invoice) => invoice.id)));
  const total = invoices.filter((invoice) => selected.has(invoice.id)).reduce((sum, invoice) => sum + invoice.remaining, 0);
  // La page du fournisseur s'ouvre à la place de l'application : le bouton reste en attente jusque-là.
  const [leaving, setLeaving] = useState(false);
  const form = useActionForm(startOnlinePayment, {
    onSuccess: ({ url }) => {
      setLeaving(true);
      window.location.assign(url);
    },
  });

  function toggle(id: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  }

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("dueInvoices")}</legend>
        <ul className="space-y-2">
          {invoices.map((invoice) => (
            <li key={invoice.id}>
              <label className="flex items-center gap-3 rounded-lg px-3 py-2.5 ring-1 ring-line hover:bg-muted/50">
                <Checkbox
                  checked={selected.has(invoice.id)}
                  onCheckedChange={(checked) => toggle(invoice.id, checked === true)}
                />
                <span className="min-w-0 flex-1 text-sm">
                  {t("invoiceDue", { label: invoice.label, amount: formatXOF(invoice.remaining) })}
                  <span className="block text-xs text-muted-foreground">
                    {invoice.number} · {t("dueOn", { date: formatDate(invoice.dueOn, { day: "numeric", month: "long" }) })}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <FormAlert message={form.fieldError("invoiceIds") ?? form.formError} />
      <Button
        type="button"
        size="touch"
        className="w-full sm:w-auto"
        disabled={form.pending || leaving || selected.size === 0}
        onClick={() => form.run({ studentId, invoiceIds: [...selected], locale })}
      >
        <Smartphone aria-hidden />
        {t("pay", { amount: formatXOF(total) })}
      </Button>
      <p className="text-xs text-muted-foreground">{t("payHint")}</p>
    </div>
  );
}
