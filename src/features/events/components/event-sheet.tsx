"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { submitForm, useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createEvent } from "../actions";
import type { EventKind } from "../queries";

const KINDS: EventKind[] = ["holiday", "exam", "meeting", "event"];

/** Nouvel événement du calendrier : vacances, examen, réunion, fête. */
export function EventSheet({ today }: { today: string }) {
  const t = useTranslations("events");
  const [open, setOpen] = useState(false);
  const [staffOnly, setStaffOnly] = useState(false);
  const form = useActionForm(createEvent, {
    onSuccess: () => {
      toast.success(t("added"));
      setOpen(false);
      setStaffOnly(false);
    },
  });
  const field = (name: string) => ({ id: `event-${name}`, name, "aria-invalid": form.hasError(name) || undefined });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button>
            <CalendarPlus aria-hidden />
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
              title: String(formData.get("title") ?? ""),
              kind: String(formData.get("kind") ?? "event") as EventKind,
              startsOn: String(formData.get("startsOn") ?? ""),
              endsOn: String(formData.get("endsOn") || formData.get("startsOn") || ""),
              description: String(formData.get("description") ?? ""),
              staffOnly,
            }),
          )}
          noValidate
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5"
        >
          <Field>
            <FieldLabel htmlFor="event-kind">{t("kind")}</FieldLabel>
            <NativeSelect id="event-kind" name="kind" defaultValue="event">
              {KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {t(`kinds.${kind}`)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field data-invalid={form.hasError("title") || undefined}>
            <FieldLabel htmlFor="event-title">{t("title")}</FieldLabel>
            <Input {...field("title")} maxLength={120} autoComplete="off" placeholder={t("titlePlaceholder")} />
            <FieldError>{form.fieldError("title")}</FieldError>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={form.hasError("startsOn") || undefined}>
              <FieldLabel htmlFor="event-startsOn">{t("startsOn")}</FieldLabel>
              <Input {...field("startsOn")} type="date" defaultValue={today} />
              <FieldError>{form.fieldError("startsOn")}</FieldError>
            </Field>
            <Field data-invalid={form.hasError("endsOn") || undefined}>
              <FieldLabel htmlFor="event-endsOn">{t("endsOn")}</FieldLabel>
              <Input {...field("endsOn")} type="date" />
              <FieldError>{form.fieldError("endsOn")}</FieldError>
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="event-description">{t("description")}</FieldLabel>
            <Textarea id="event-description" name="description" rows={3} maxLength={1000} />
          </Field>
          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl p-4 ring-1 ring-line">
            <span>
              <span className="block text-sm font-semibold text-ink">{t("staffOnly")}</span>
              <span className="block text-xs text-muted-foreground">{t("staffOnlyHint")}</span>
            </span>
            <Switch checked={staffOnly} onCheckedChange={setStaffOnly} aria-label={t("staffOnly")} />
          </label>
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
