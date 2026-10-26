"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { submitForm, useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cancelInvoice } from "../actions";

/** Annulation d'une facture impayée, avec son motif (elle pourra être réémise). */
export function CancelInvoiceForm({ invoiceId }: { invoiceId: string }) {
  const t = useTranslations("invoices");
  const [open, setOpen] = useState(false);
  const form = useActionForm(cancelInvoice, { onSuccess: () => toast.success(t("cancelled")) });

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Ban aria-hidden />
        {t("cancelInvoice")}
      </Button>
    );
  }
  return (
    <form
      onSubmit={submitForm((formData) => form.run({ id: invoiceId, reason: String(formData.get("reason") ?? "") }))}
      noValidate
      className="grid gap-2"
    >
      <label htmlFor="cancel-reason" className="text-sm font-medium">
        {t("cancelReason")}
      </label>
      <Input id="cancel-reason" name="reason" maxLength={200} autoFocus aria-invalid={form.hasError("reason") || undefined} />
      <FieldError>{form.fieldError("reason")}</FieldError>
      <FormAlert message={form.formError} />
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" disabled={form.pending}>
          {t("confirmCancel")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
