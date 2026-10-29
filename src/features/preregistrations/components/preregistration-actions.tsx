"use client";

import { useState } from "react";
import { Check, UserPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { submitForm, useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { decidePreregistration, enrollPreregistration } from "../actions";
import type { PreregistrationStatus } from "../schemas";

type ClassOption = { id: string; name: string; matches: boolean };

/** Décision de la direction sur une demande : la retenir, la refuser, inscrire l'enfant. */
export function PreregistrationActions({
  id,
  status,
  childName,
  classes,
}: {
  id: string;
  status: PreregistrationStatus;
  childName: string;
  classes: ClassOption[];
}) {
  if (status === "enrolled") return null;
  return (
    <div className="flex flex-wrap gap-2">
      <EnrollDialog id={id} childName={childName} classes={classes} />
      {status !== "accepted" && <DecisionDialog id={id} decision="accepted" />}
      {status !== "rejected" && <DecisionDialog id={id} decision="rejected" />}
    </div>
  );
}

function DecisionDialog({ id, decision }: { id: string; decision: "accepted" | "rejected" }) {
  const t = useTranslations("preregistrations.decision");
  const [open, setOpen] = useState(false);
  const form = useActionForm(decidePreregistration, {
    onSuccess: ({ notified }) => {
      toast.success(t(notified ? `${decision}Notified` : `${decision}Done`));
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={decision === "accepted" ? "outline" : "ghost"}>
            {decision === "accepted" ? <Check aria-hidden /> : <X aria-hidden />}
            {t(`${decision}Action`)}
          </Button>
        }
      />
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{t(`${decision}Title`)}</DialogTitle>
          <DialogDescription>{t(`${decision}Hint`)}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={submitForm((formData) => form.run({ id, status: decision, note: String(formData.get("note") ?? "") }))}
          noValidate
          className="flex flex-col gap-4"
        >
          <Field data-invalid={form.hasError("note") || undefined}>
            <FieldLabel htmlFor={`decision-note-${decision}`}>{t("note")}</FieldLabel>
            <Textarea
              id={`decision-note-${decision}`}
              name="note"
              rows={3}
              maxLength={500}
              placeholder={t(`${decision}Placeholder`)}
            />
            <FieldDescription>{t("noteHint")}</FieldDescription>
            <FieldError>{form.fieldError("note")}</FieldError>
          </Field>
          <FormAlert message={form.formError} />
          <div className="flex gap-3">
            <Button
              type="submit"
              variant={decision === "rejected" ? "destructive" : "default"}
              className="flex-1"
              disabled={form.pending}
            >
              {t(`${decision}Confirm`)}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EnrollDialog({ id, childName, classes }: { id: string; childName: string; classes: ClassOption[] }) {
  const t = useTranslations("preregistrations.enroll");
  const tForm = useTranslations("students.form");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useActionForm(enrollPreregistration, {
    onSuccess: ({ studentId, notified }) => {
      toast.success(t(notified ? "doneNotified" : "done", { name: childName }));
      router.push(`/direction/eleves/${studentId}`);
    },
  });
  const suggested = classes.filter((c) => c.matches);
  const others = classes.filter((c) => !c.matches);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="sun" disabled={classes.length === 0}>
            <UserPlus aria-hidden />
            {t("action")}
          </Button>
        }
      />
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{t("title", { name: childName })}</DialogTitle>
          <DialogDescription>{t("hint")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={submitForm((formData) =>
            form.run({ id, classId: String(formData.get("classId") ?? ""), matricule: String(formData.get("matricule") ?? "") }),
          )}
          noValidate
          className="flex flex-col gap-4"
        >
          <Field data-invalid={form.hasError("classId") || undefined}>
            <FieldLabel htmlFor="enroll-class">{tForm("class")}</FieldLabel>
            <NativeSelect id="enroll-class" name="classId" defaultValue={suggested.length === 1 ? suggested[0]!.id : ""} required>
              <option value="" disabled>
                {tForm("chooseClass")}
              </option>
              {suggested.length > 0 && (
                <optgroup label={t("suggested")}>
                  {suggested.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {others.length > 0 && (
                <optgroup label={suggested.length > 0 ? t("otherClasses") : t("allClasses")}>
                  {others.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </NativeSelect>
            <FieldError>{form.fieldError("classId")}</FieldError>
          </Field>
          <Field data-invalid={form.hasError("matricule") || undefined}>
            <FieldLabel htmlFor="enroll-matricule">{t("matricule")}</FieldLabel>
            <Input id="enroll-matricule" name="matricule" maxLength={30} autoComplete="off" />
            <FieldDescription>{t("matriculeHint")}</FieldDescription>
            <FieldError>{form.fieldError("matricule")}</FieldError>
          </Field>
          <FormAlert message={form.formError} />
          <div className="flex gap-3">
            <Button type="submit" className="flex-1" disabled={form.pending}>
              {t("confirm")}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tForm("cancel")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
