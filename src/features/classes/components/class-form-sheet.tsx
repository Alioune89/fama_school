"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { submitForm, useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { updateClass } from "@/features/classes/actions";

type Props = {
  klass: { id: string; name: string; room: string | null; capacity: number | null; homeroomStaffId: string | null };
  teachers: { id: string; full_name: string }[];
  /** Préscolaire et élémentaire : on parle de titulaire, pas de professeur principal. */
  titularMode?: boolean;
  trigger: ReactNode;
};

export function ClassFormSheet({ klass, teachers, titularMode = false, trigger }: Props) {
  const t = useTranslations("classes.form");
  const [open, setOpen] = useState(false);
  const form = useActionForm(updateClass, {
    onSuccess: () => {
      toast.success(t("updated"));
      setOpen(false);
    },
  });

  const field = (name: string) => ({ id: name, name, "aria-invalid": form.hasError(name) || undefined });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger as React.ReactElement} />
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-line px-6 py-5">
          <SheetTitle className="text-lg font-bold">{t("title")}</SheetTitle>
          <SheetDescription>{t(titularMode ? "titularFormHint" : "hint")}</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={submitForm((formData) =>
            form.run({
              id: klass.id,
              name: String(formData.get("name") ?? ""),
              room: String(formData.get("room") ?? ""),
              capacity: String(formData.get("capacity") ?? ""),
              homeroomStaffId: String(formData.get("homeroomStaffId") ?? ""),
            }),
          )}
          noValidate
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5"
        >
          <Field data-invalid={form.hasError("name") || undefined}>
            <FieldLabel htmlFor="name">{t("name")}</FieldLabel>
            <Input {...field("name")} defaultValue={klass.name} required autoComplete="off" />
            <FieldError>{form.fieldError("name")}</FieldError>
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={form.hasError("room") || undefined}>
              <FieldLabel htmlFor="room">{t("room")}</FieldLabel>
              <Input {...field("room")} defaultValue={klass.room ?? ""} placeholder={t("roomPlaceholder")} />
              <FieldError>{form.fieldError("room")}</FieldError>
            </Field>
            <Field data-invalid={form.hasError("capacity") || undefined}>
              <FieldLabel htmlFor="capacity">{t("capacity")}</FieldLabel>
              <Input
                {...field("capacity")}
                type="number"
                inputMode="numeric"
                min={1}
                max={200}
                defaultValue={klass.capacity ?? ""}
              />
              <FieldError>{form.fieldError("capacity")}</FieldError>
            </Field>
          </div>
          <Field data-invalid={form.hasError("homeroomStaffId") || undefined}>
            <FieldLabel htmlFor="homeroomStaffId">{t(titularMode ? "titular" : "homeroom")}</FieldLabel>
            <NativeSelect {...field("homeroomStaffId")} defaultValue={klass.homeroomStaffId ?? ""}>
              <option value="">{t("noHomeroom")}</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name}
                </option>
              ))}
            </NativeSelect>
            <FieldDescription>{t(titularMode ? "titularHint" : "homeroomHint")}</FieldDescription>
            <FieldError>{form.fieldError("homeroomStaffId")}</FieldError>
          </Field>
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
