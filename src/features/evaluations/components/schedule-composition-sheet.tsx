"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { submitForm, useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { scheduleComposition } from "../actions";
import type { Period } from "../queries";

export type ScheduleSubject = { id: string; name: string; classes: { id: string; name: string }[] };

/** La direction programme une composition (même matière, même date) pour plusieurs classes. */
export function ScheduleCompositionSheet({ subjects, period }: { subjects: ScheduleSubject[]; period: Period }) {
  const t = useTranslations("evaluations");
  const [open, setOpen] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [classIds, setClassIds] = useState<string[]>([]);
  const subject = subjects.find((s) => s.id === subjectId);
  const form = useActionForm(scheduleComposition, {
    onSuccess: ({ count }) => {
      toast.success(t("scheduled", { count }));
      setOpen(false);
      setSubjectId("");
      setClassIds([]);
    },
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button>
            <CalendarPlus aria-hidden />
            {t("schedule")}
          </Button>
        }
      />
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-line px-6 py-5">
          <SheetTitle className="text-lg font-bold">{t("schedule")}</SheetTitle>
          <SheetDescription>{t("scheduleHint", { period: period.label })}</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={submitForm((formData) =>
            form.run({
              subjectId,
              periodId: period.id,
              title: String(formData.get("title") ?? ""),
              heldOn: String(formData.get("heldOn") ?? ""),
              classIds,
            }),
          )}
          noValidate
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5"
        >
          <Field data-invalid={form.hasError("subjectId") || undefined}>
            <FieldLabel htmlFor="schedule-subject">{t("subject")}</FieldLabel>
            <NativeSelect
              id="schedule-subject"
              value={subjectId}
              onChange={(event) => {
                const next = subjects.find((s) => s.id === event.target.value);
                setSubjectId(event.target.value);
                setClassIds(next ? next.classes.map((c) => c.id) : []);
              }}
              aria-invalid={form.hasError("subjectId") || undefined}
            >
              <option value="">{t("chooseSubject")}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
            <FieldError>{form.fieldError("subjectId")}</FieldError>
          </Field>
          <Field data-invalid={form.hasError("title") || undefined}>
            <FieldLabel htmlFor="schedule-title">{t("titleLabel")}</FieldLabel>
            <Input
              id="schedule-title"
              name="title"
              defaultValue={t("compositionTitle", { period: period.label })}
              maxLength={80}
              aria-invalid={form.hasError("title") || undefined}
            />
            <FieldError>{form.fieldError("title")}</FieldError>
          </Field>
          <Field data-invalid={form.hasError("heldOn") || undefined}>
            <FieldLabel htmlFor="schedule-heldOn">{t("heldOn")}</FieldLabel>
            <Input
              id="schedule-heldOn"
              name="heldOn"
              type="date"
              min={period.startsOn}
              max={period.endsOn}
              aria-invalid={form.hasError("heldOn") || undefined}
            />
            <FieldError>{form.fieldError("heldOn")}</FieldError>
          </Field>
          {subject && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{t("classes")}</legend>
              <div className="grid grid-cols-2 gap-2">
                {subject.classes.map((klass) => (
                  <label key={klass.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                    <Checkbox
                      checked={classIds.includes(klass.id)}
                      onCheckedChange={(checked) =>
                        setClassIds((ids) => (checked ? [...ids, klass.id] : ids.filter((id) => id !== klass.id)))
                      }
                    />
                    {klass.name}
                  </label>
                ))}
              </div>
              {form.hasError("classIds") && <p className="mt-2 text-sm text-destructive">{form.fieldError("classIds")}</p>}
            </fieldset>
          )}
          <FormAlert message={form.formError} />
          <div className="mt-auto flex gap-3 pt-2">
            <Button type="submit" size="lg" className="flex-1" disabled={form.pending}>
              {t("scheduleSubmit", { count: classIds.length })}
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
