"use client";

import { useState } from "react";
import { ListPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { addChapters } from "../actions";

const monthLabel = (month: string) =>
  new Date(`${month}-01T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

/** Ajout rapide de chapitres : un par ligne, avec le nombre de séances et le mois visé communs. */
export function AddChaptersSheet({ levelId, subjectId, months }: { levelId: string; subjectId: string; months: string[] }) {
  const t = useTranslations("programme");
  const [open, setOpen] = useState(false);
  const [titles, setTitles] = useState("");
  const [sessions, setSessions] = useState(4);
  const [targetMonth, setTargetMonth] = useState("");
  const form = useActionForm(addChapters, {
    onSuccess: ({ count }) => {
      toast.success(t("added", { count }));
      setTitles("");
      setOpen(false);
    },
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button>
            <ListPlus aria-hidden />
            {t("addChapters")}
          </Button>
        }
      />
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-line px-6 py-5">
          <SheetTitle className="text-lg font-bold">{t("addChapters")}</SheetTitle>
          <SheetDescription>{t("addHint")}</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            form.run({ levelId, subjectId, titles, sessions, targetMonth: targetMonth || null });
          }}
          noValidate
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5"
        >
          <Field data-invalid={form.hasError("titles") || undefined}>
            <FieldLabel htmlFor="chapter-titles">{t("chapters")}</FieldLabel>
            <Textarea
              id="chapter-titles"
              rows={8}
              value={titles}
              onChange={(event) => setTitles(event.target.value)}
              placeholder={t("chaptersPlaceholder")}
            />
            <FieldDescription>{t("chaptersHint")}</FieldDescription>
            <FieldError>{form.fieldError("titles")}</FieldError>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="chapter-sessions">{t("sessions")}</FieldLabel>
              <Input
                id="chapter-sessions"
                type="number"
                min={1}
                max={60}
                value={sessions}
                onChange={(event) => setSessions(Number(event.target.value))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="chapter-month">{t("targetMonth")}</FieldLabel>
              <NativeSelect id="chapter-month" value={targetMonth} onChange={(event) => setTargetMonth(event.target.value)}>
                <option value="">{t("noTarget")}</option>
                {months.map((month) => (
                  <option key={month} value={month}>
                    {monthLabel(month)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <FormAlert message={form.formError} />
          <div className="mt-auto flex gap-3 pt-2">
            <Button type="submit" size="lg" className="flex-1" disabled={form.pending}>
              {t("add")}
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
