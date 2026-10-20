"use client";

import { useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { submitForm, useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { registerStudent, updateStudent } from "@/features/students/actions";
import { RELATIONSHIPS, type Relationship } from "@/features/students/schemas";
import { useRouter } from "@/i18n/navigation";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  sex: "F" | "M";
  birthDate: string | null;
  birthPlace: string | null;
  nationality: string | null;
  address: string | null;
  medicalNotes: string | null;
};

type ClassOption = { id: string; name: string; capacity: number | null; count: number };

type Props = {
  /** Sans élève : inscription (classe + parents) ; avec élève : modification de l'identité. */
  student?: Student;
  classes?: ClassOption[];
  defaultClassId?: string;
  trigger: ReactNode;
};

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");

export function StudentFormSheet({ student, classes = [], defaultClassId, trigger }: Props) {
  const t = useTranslations("students");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [guardianCount, setGuardianCount] = useState(1);

  const register = useActionForm(registerStudent, {
    onSuccess: ({ id }) => {
      toast.success(t("form.registered"));
      setOpen(false);
      router.push(`/direction/eleves/${id}`);
    },
  });
  const update = useActionForm(updateStudent, {
    onSuccess: () => {
      toast.success(t("form.updated"));
      setOpen(false);
    },
  });
  const form = student ? update : register;

  const submit = (formData: FormData) => {
    const identity = {
      firstName: text(formData, "firstName"),
      lastName: text(formData, "lastName"),
      sex: text(formData, "sex") as "F" | "M",
      birthDate: text(formData, "birthDate"),
      birthPlace: text(formData, "birthPlace"),
      nationality: text(formData, "nationality"),
      address: text(formData, "address"),
      medicalNotes: text(formData, "medicalNotes"),
    };
    if (student) {
      update.run({ id: student.id, ...identity });
      return;
    }
    register.run({
      ...identity,
      matricule: text(formData, "matricule"),
      classId: text(formData, "classId"),
      guardians: Array.from({ length: guardianCount }, (_, i) => ({
        fullName: text(formData, `guardians.${i}.fullName`),
        phone: text(formData, `guardians.${i}.phone`),
        relationship: text(formData, `guardians.${i}.relationship`) as Relationship,
      })),
    });
  };

  const field = (name: string) => ({
    id: name,
    name,
    "aria-invalid": form.hasError(name) || undefined,
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setGuardianCount(1);
      }}
    >
      <SheetTrigger render={trigger as React.ReactElement} />
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-line px-6 py-5">
          <SheetTitle className="text-lg font-bold">{student ? t("form.editTitle") : t("form.registerTitle")}</SheetTitle>
          <SheetDescription>{student ? t("form.editHint") : t("form.registerHint")}</SheetDescription>
        </SheetHeader>
        <form onSubmit={submitForm(submit)} noValidate className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-sm font-semibold text-ink">{t("form.identity")}</legend>
            <Field data-invalid={form.hasError("lastName") || undefined}>
              <FieldLabel htmlFor="lastName">{t("form.lastName")}</FieldLabel>
              <Input {...field("lastName")} defaultValue={student?.lastName} required autoComplete="off" />
              <FieldError>{form.fieldError("lastName")}</FieldError>
            </Field>
            <Field data-invalid={form.hasError("firstName") || undefined}>
              <FieldLabel htmlFor="firstName">{t("form.firstName")}</FieldLabel>
              <Input {...field("firstName")} defaultValue={student?.firstName} required autoComplete="off" />
              <FieldError>{form.fieldError("firstName")}</FieldError>
            </Field>
            <Field data-invalid={form.hasError("sex") || undefined}>
              <FieldLabel htmlFor="sex">{t("form.sex")}</FieldLabel>
              <NativeSelect {...field("sex")} defaultValue={student?.sex ?? ""} required>
                <option value="" disabled>
                  {t("form.choose")}
                </option>
                <option value="F">{t("sex.F")}</option>
                <option value="M">{t("sex.M")}</option>
              </NativeSelect>
              <FieldError>{form.fieldError("sex")}</FieldError>
            </Field>
            <Field data-invalid={form.hasError("birthDate") || undefined}>
              <FieldLabel htmlFor="birthDate">{t("form.birthDate")}</FieldLabel>
              <Input {...field("birthDate")} type="date" min="1980-01-02" defaultValue={student?.birthDate ?? ""} />
              <FieldError>{form.fieldError("birthDate")}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="birthPlace">{t("form.birthPlace")}</FieldLabel>
              <Input {...field("birthPlace")} defaultValue={student?.birthPlace ?? ""} placeholder="Dakar" />
            </Field>
            <Field>
              <FieldLabel htmlFor="nationality">{t("form.nationality")}</FieldLabel>
              <Input
                {...field("nationality")}
                defaultValue={student?.nationality ?? ""}
                placeholder={t("form.nationalityPlaceholder")}
              />
            </Field>
          </fieldset>

          {!student && (
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-3 text-sm font-semibold text-ink">{t("form.schooling")}</legend>
              <Field data-invalid={form.hasError("classId") || undefined}>
                <FieldLabel htmlFor="classId">{t("form.class")}</FieldLabel>
                <NativeSelect {...field("classId")} defaultValue={defaultClassId ?? ""} required>
                  <option value="" disabled>
                    {t("form.chooseClass")}
                  </option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.capacity ? t("form.classOption", { name: c.name, count: c.count, capacity: c.capacity }) : c.name}
                    </option>
                  ))}
                </NativeSelect>
                <FieldError>{form.fieldError("classId")}</FieldError>
              </Field>
              <Field data-invalid={form.hasError("matricule") || undefined}>
                <FieldLabel htmlFor="matricule">{t("form.matricule")}</FieldLabel>
                <Input {...field("matricule")} autoComplete="off" />
                <FieldDescription>{t("form.matriculeHint")}</FieldDescription>
                <FieldError>{form.fieldError("matricule")}</FieldError>
              </Field>
            </fieldset>
          )}

          {!student && (
            <fieldset className="flex flex-col gap-4">
              <legend className="mb-1 text-sm font-semibold text-ink">{t("form.guardians")}</legend>
              <p className="-mt-2 text-xs text-muted-foreground">{t("form.guardiansHint")}</p>
              {Array.from({ length: guardianCount }, (_, i) => (
                <div key={i} className="grid gap-4 rounded-xl bg-azure-50/60 p-4 ring-1 ring-line/70 sm:grid-cols-2">
                  <div className="flex items-center justify-between sm:col-span-2">
                    <span className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
                      {t("form.guardianN", { n: i + 1 })}
                    </span>
                    {i > 0 && (
                      <Button type="button" variant="ghost" size="xs" onClick={() => setGuardianCount(i)}>
                        <Trash2 aria-hidden />
                        {t("form.removeGuardian")}
                      </Button>
                    )}
                  </div>
                  <Field data-invalid={form.hasError(`guardians.${i}.fullName`) || undefined} className="sm:col-span-2">
                    <FieldLabel htmlFor={`guardians.${i}.fullName`}>{t("form.guardianName")}</FieldLabel>
                    <Input {...field(`guardians.${i}.fullName`)} autoComplete="off" />
                    <FieldError>{form.fieldError(`guardians.${i}.fullName`)}</FieldError>
                  </Field>
                  <Field data-invalid={form.hasError(`guardians.${i}.phone`) || undefined}>
                    <FieldLabel htmlFor={`guardians.${i}.phone`}>{t("form.guardianPhone")}</FieldLabel>
                    <Input {...field(`guardians.${i}.phone`)} type="tel" inputMode="tel" placeholder="77 123 45 67" />
                    <FieldError>{form.fieldError(`guardians.${i}.phone`)}</FieldError>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`guardians.${i}.relationship`}>{t("form.relationship")}</FieldLabel>
                    <NativeSelect {...field(`guardians.${i}.relationship`)} defaultValue={i === 0 ? "father" : "mother"}>
                      {RELATIONSHIPS.map((relationship) => (
                        <option key={relationship} value={relationship}>
                          {t(`relationships.${relationship}`)}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
              ))}
              {guardianCount < 2 && (
                <Button type="button" variant="outline" className="self-start" onClick={() => setGuardianCount(2)}>
                  <Plus aria-hidden />
                  {t("form.addGuardian")}
                </Button>
              )}
              {form.hasError("guardians") && <p className="text-sm text-destructive">{form.fieldError("guardians")}</p>}
            </fieldset>
          )}

          <fieldset className="grid gap-4">
            <legend className="mb-3 text-sm font-semibold text-ink">{t("form.more")}</legend>
            <Field>
              <FieldLabel htmlFor="address">{t("form.address")}</FieldLabel>
              <Input {...field("address")} defaultValue={student?.address ?? ""} placeholder={t("form.addressPlaceholder")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="medicalNotes">{t("form.medicalNotes")}</FieldLabel>
              <Textarea
                {...field("medicalNotes")}
                rows={3}
                defaultValue={student?.medicalNotes ?? ""}
                placeholder={t("form.medicalNotesPlaceholder")}
              />
            </Field>
          </fieldset>

          <FormAlert message={form.formError} />
          <div className="mt-auto flex gap-3 pt-2">
            <Button type="submit" size="lg" className="flex-1" disabled={form.pending}>
              {student ? t("form.save") : t("form.register")}
            </Button>
            <Button type="button" size="lg" variant="outline" onClick={() => setOpen(false)}>
              {t("form.cancel")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
