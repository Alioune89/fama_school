"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { submitForm, useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { reviewAbsenceJustification } from "../actions";
import { REVIEW_NOTE_MAX, type JustificationStatus } from "../schemas";

/** Accepter ou refuser (avec une remarque pour la famille) ; une décision prise peut être changée. */
export function ReviewActions({ id, status }: { id: string; status: JustificationStatus }) {
  const t = useTranslations("justifications.review");
  const [open, setOpen] = useState(false);
  const accept = useActionForm(reviewAbsenceJustification, { onSuccess: () => toast.success(t("accepted")) });
  const refuse = useActionForm(reviewAbsenceJustification, {
    onSuccess: () => {
      toast.success(t("refused"));
      setOpen(false);
    },
  });
  const pending = accept.pending || refuse.pending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "accepted" && (
        <Button size="sm" disabled={pending} onClick={() => accept.run({ id, decision: "accepted", note: undefined })}>
          <Check aria-hidden />
          {t("accept")}
        </Button>
      )}
      {status !== "refused" && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button size="sm" variant="outline" disabled={pending}>
                <X aria-hidden />
                {t("refuse")}
              </Button>
            }
          />
          <DialogContent showCloseButton={false} className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">{t("refuseTitle")}</DialogTitle>
              <DialogDescription>{t("hint")}</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={submitForm((formData) =>
                refuse.run({ id, decision: "refused", note: String(formData.get("note") ?? "") }),
              )}
              noValidate
              className="flex flex-col gap-4"
            >
              <Field data-invalid={refuse.hasError("note") || undefined}>
                <FieldLabel htmlFor={`review-note-${id}`}>{t("note")}</FieldLabel>
                <Textarea
                  id={`review-note-${id}`}
                  name="note"
                  rows={3}
                  maxLength={REVIEW_NOTE_MAX}
                  placeholder={t("notePlaceholder")}
                />
                <FieldError>{refuse.fieldError("note")}</FieldError>
              </Field>
              <FormAlert message={refuse.formError} />
              <div className="flex gap-3">
                <Button type="submit" variant="destructive" className="flex-1" disabled={refuse.pending}>
                  {t("confirmRefuse")}
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t("cancel")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
      <FormAlert message={accept.formError} />
    </div>
  );
}
