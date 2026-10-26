"use client";

import { useState, useTransition } from "react";
import { Ban, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { submitForm, useActionForm, useMessage } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Enums } from "@/lib/supabase/database.types";
import { decideCancellation, requestCancellation } from "../actions";

/**
 * Annulation d'un paiement en deux temps : demande avec motif (direction financière), puis décision
 * du fondateur ou du directeur (une autre personne que l'auteur de la demande).
 */
export function CancellationPanel({
  paymentId,
  status,
  reason,
  canRequest,
  canDecide,
}: {
  paymentId: string;
  status: Enums<"payment_status">;
  reason: string | null;
  canRequest: boolean;
  /** Fondateur ou directeur, et pas l'auteur de la demande. */
  canDecide: boolean;
}) {
  const t = useTranslations("payments");
  const message = useMessage();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useActionForm(requestCancellation, { onSuccess: () => toast.success(t("requested")) });

  const decide = (approve: boolean) =>
    startTransition(async () => {
      const result = await decideCancellation({ id: paymentId, approve });
      if (result.ok) toast.success(t(approve ? "approved" : "rejected"));
      else toast.error(message(result.error));
    });

  if (status === "cancelled") {
    return (
      <p className="rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{t("cancelledBecause", { reason: reason ?? "" })}</p>
    );
  }
  if (status === "cancel_requested") {
    return (
      <div className="space-y-3 rounded-lg bg-warning-50 p-3 text-sm">
        <p className="font-semibold text-warning-700">{t("pendingDecision", { reason: reason ?? "" })}</p>
        <p className="text-ink-soft">{t("pendingHint")}</p>
        {canDecide && (
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" disabled={pending} onClick={() => decide(true)}>
              <Check aria-hidden />
              {t("approve")}
            </Button>
            <Button variant="outline" disabled={pending} onClick={() => decide(false)}>
              <X aria-hidden />
              {t("reject")}
            </Button>
          </div>
        )}
      </div>
    );
  }
  if (!canRequest) return null;
  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Ban aria-hidden />
        {t("requestCancel")}
      </Button>
    );
  }
  return (
    <form
      onSubmit={submitForm((formData) => form.run({ id: paymentId, reason: String(formData.get("reason") ?? "") }))}
      noValidate
      className="grid gap-2"
    >
      <label htmlFor="payment-cancel-reason" className="text-sm font-medium">
        {t("cancelReason")}
      </label>
      <Input
        id="payment-cancel-reason"
        name="reason"
        maxLength={200}
        autoFocus
        aria-invalid={form.hasError("reason") || undefined}
      />
      <FieldError>{form.fieldError("reason")}</FieldError>
      <FormAlert message={form.formError} />
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" disabled={form.pending}>
          {t("confirmRequest")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
