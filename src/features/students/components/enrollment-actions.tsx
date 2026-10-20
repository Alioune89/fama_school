"use client";

import { useState, useTransition } from "react";
import { ArrowRightLeft, LogOut, Undo2, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm, useMessage } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { cancelDeparture, changeClass, endEnrollment } from "@/features/students/actions";
import { DEPARTURE_STATUSES } from "@/features/students/schemas";

type ClassOption = { id: string; name: string; capacity: number | null; count: number };

type Props = {
  studentId: string;
  /** Inscription de l'année en cours (null : pas inscrit cette année). */
  current: { classId: string | null; status: string } | null;
  yearLabel: string | null;
  classes: ClassOption[];
};

/** Date du jour à Dakar (UTC toute l'année), au format du champ date. */
const today = () => new Date().toISOString().slice(0, 10);

export function EnrollmentActions({ studentId, current, yearLabel, classes }: Props) {
  const t = useTranslations("students.enrollment");
  const message = useMessage();
  const [pending, startTransition] = useTransition();

  if (current && current.status !== "active") {
    return (
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await cancelDeparture({ studentId });
            if (result.ok) toast.success(t("cancelled"));
            else toast.error(message(result.error));
          })
        }
      >
        <Undo2 aria-hidden />
        {t("cancelDeparture")}
      </Button>
    );
  }

  if (!yearLabel || classes.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <ClassDialog studentId={studentId} currentClassId={current?.classId ?? null} yearLabel={yearLabel} classes={classes} />
      {current && <DepartureDialog studentId={studentId} />}
    </div>
  );
}

function ClassDialog({
  studentId,
  currentClassId,
  yearLabel,
  classes,
}: {
  studentId: string;
  currentClassId: string | null;
  yearLabel: string;
  classes: ClassOption[];
}) {
  const t = useTranslations("students.enrollment");
  const tForm = useTranslations("students.form");
  const [open, setOpen] = useState(false);
  const enrolled = Boolean(currentClassId);
  const form = useActionForm(changeClass, {
    onSuccess: () => {
      toast.success(enrolled ? t("moved") : t("enrolled"));
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            {enrolled ? <ArrowRightLeft aria-hidden /> : <UserPlus aria-hidden />}
            {enrolled ? t("changeClass") : t("enroll", { year: yearLabel })}
          </Button>
        }
      />
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {enrolled ? t("changeClassTitle") : t("enroll", { year: yearLabel })}
          </DialogTitle>
          <DialogDescription>{enrolled ? t("changeClassHint") : t("enrollHint")}</DialogDescription>
        </DialogHeader>
        <form
          action={(formData) => form.run({ studentId, classId: String(formData.get("classId") ?? "") })}
          noValidate
          className="flex flex-col gap-4"
        >
          <Field data-invalid={form.hasError("classId") || undefined}>
            <FieldLabel htmlFor="enrollment-class">{tForm("class")}</FieldLabel>
            <NativeSelect id="enrollment-class" name="classId" defaultValue="" required>
              <option value="" disabled>
                {tForm("chooseClass")}
              </option>
              {classes
                .filter((c) => c.id !== currentClassId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.capacity ? tForm("classOption", { name: c.name, count: c.count, capacity: c.capacity }) : c.name}
                  </option>
                ))}
            </NativeSelect>
            <FieldError>{form.fieldError("classId")}</FieldError>
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

function DepartureDialog({ studentId }: { studentId: string }) {
  const t = useTranslations("students.enrollment");
  const tForm = useTranslations("students.form");
  const tStatus = useTranslations("students.enrollmentStatus");
  const [open, setOpen] = useState(false);
  const form = useActionForm(endEnrollment, {
    onSuccess: () => {
      toast.success(t("departed"));
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost">
            <LogOut aria-hidden />
            {t("departure")}
          </Button>
        }
      />
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{t("departureTitle")}</DialogTitle>
          <DialogDescription>{t("departureHint")}</DialogDescription>
        </DialogHeader>
        <form
          action={(formData) =>
            form.run({
              studentId,
              status: String(formData.get("status") ?? "") as (typeof DEPARTURE_STATUSES)[number],
              leftOn: String(formData.get("leftOn") ?? ""),
            })
          }
          noValidate
          className="flex flex-col gap-4"
        >
          <Field data-invalid={form.hasError("status") || undefined}>
            <FieldLabel htmlFor="departure-status">{t("reason")}</FieldLabel>
            <NativeSelect id="departure-status" name="status" defaultValue="transferred">
              {DEPARTURE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {tStatus(status)}
                </option>
              ))}
            </NativeSelect>
            <FieldError>{form.fieldError("status")}</FieldError>
          </Field>
          <Field data-invalid={form.hasError("leftOn") || undefined}>
            <FieldLabel htmlFor="departure-date">{t("leftOn")}</FieldLabel>
            <Input id="departure-date" name="leftOn" type="date" defaultValue={today()} max={today()} required />
            <FieldError>{form.fieldError("leftOn")}</FieldError>
          </Field>
          <FormAlert message={form.formError} />
          <div className="flex gap-3">
            <Button type="submit" variant="destructive" className="flex-1" disabled={form.pending}>
              {t("confirmDeparture")}
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
