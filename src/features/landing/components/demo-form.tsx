"use client";

import { useState } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormAlert } from "@/components/forms/form-alert";
import { submitForm, useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { submitDemoRequest } from "@/features/landing/actions";
import { DEMO_ROLES, STUDENT_RANGES, type DemoRequestInput } from "@/features/landing/schemas";

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");

export function DemoForm() {
  const t = useTranslations("landing.demo");
  const [sent, setSent] = useState(false);
  const form = useActionForm(submitDemoRequest, { onSuccess: () => setSent(true) });

  if (sent) {
    return (
      <div
        role="status"
        className="flex flex-col items-start gap-3 rounded-2xl bg-white p-6 shadow-float ring-1 ring-line/70 sm:p-8"
      >
        <CheckCircle2 className="size-10 text-success-500" aria-hidden />
        <p className="text-xl font-bold">{t("successTitle")}</p>
        <p className="text-sm text-ink-soft">{t("successBody")}</p>
        <Button variant="outline" className="mt-2" onClick={() => setSent(false)}>
          {t("again")}
        </Button>
      </div>
    );
  }

  // Une erreur dans les précisions facultatives les garde ouvertes.
  const hasDetailError = ["city", "email", "message"].some((name) => form.hasError(name));
  const field = (name: string) => ({ id: `demo-${name}`, name, "aria-invalid": form.hasError(name) || undefined });

  return (
    <form
      onSubmit={submitForm((formData) =>
        form.run({
          fullName: text(formData, "fullName"),
          schoolName: text(formData, "schoolName"),
          role: (text(formData, "role") || null) as DemoRequestInput["role"],
          phone: text(formData, "phone"),
          email: text(formData, "email"),
          city: text(formData, "city"),
          studentsRange: (text(formData, "studentsRange") || null) as DemoRequestInput["studentsRange"],
          message: text(formData, "message"),
          website: text(formData, "website"),
        }),
      )}
      noValidate
      className="grid gap-4 rounded-2xl bg-white p-6 shadow-float ring-1 ring-line/70 sm:grid-cols-2 sm:p-8"
    >
      {/* L'essentiel en trois champs ; le reste se précise au téléphone. */}
      <Field data-invalid={form.hasError("fullName") || undefined}>
        <FieldLabel htmlFor="demo-fullName">{t("fullName")}</FieldLabel>
        <Input {...field("fullName")} autoComplete="name" required />
        <FieldError>{form.fieldError("fullName")}</FieldError>
      </Field>
      <Field data-invalid={form.hasError("phone") || undefined}>
        <FieldLabel htmlFor="demo-phone">{t("phone")}</FieldLabel>
        <Input {...field("phone")} type="tel" inputMode="tel" autoComplete="tel" placeholder="77 123 45 67" required />
        <FieldError>{form.fieldError("phone")}</FieldError>
      </Field>
      <Field data-invalid={form.hasError("schoolName") || undefined} className="sm:col-span-2">
        <FieldLabel htmlFor="demo-schoolName">{t("schoolName")}</FieldLabel>
        <Input {...field("schoolName")} autoComplete="organization" required />
        <FieldError>{form.fieldError("schoolName")}</FieldError>
      </Field>

      <details className="group sm:col-span-2" open={hasDetailError || undefined}>
        <summary className="cursor-pointer list-none text-sm font-semibold text-azure-700 marker:hidden">
          <span className="inline-flex items-center gap-1.5">
            <Plus className="size-4 transition-transform group-open:rotate-45" aria-hidden />
            {t("moreDetails")}
          </span>
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="demo-role">{t("role")}</FieldLabel>
            <NativeSelect {...field("role")} defaultValue="">
              <option value="">{t("choose")}</option>
              {DEMO_ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(`roles.${role}`)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field data-invalid={form.hasError("city") || undefined}>
            <FieldLabel htmlFor="demo-city">{t("city")}</FieldLabel>
            <Input {...field("city")} autoComplete="address-level2" placeholder="Dakar" />
            <FieldError>{form.fieldError("city")}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="demo-studentsRange">{t("studentsRange")}</FieldLabel>
            <NativeSelect {...field("studentsRange")} defaultValue="">
              <option value="">{t("choose")}</option>
              {STUDENT_RANGES.map((range) => (
                <option key={range} value={range}>
                  {t(`ranges.${range}`)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field data-invalid={form.hasError("email") || undefined}>
            <FieldLabel htmlFor="demo-email">{t("email")}</FieldLabel>
            <Input {...field("email")} type="email" inputMode="email" autoComplete="email" />
            <FieldError>{form.fieldError("email")}</FieldError>
          </Field>
          <Field data-invalid={form.hasError("message") || undefined} className="sm:col-span-2">
            <FieldLabel htmlFor="demo-message">{t("message")}</FieldLabel>
            <Textarea {...field("message")} rows={3} placeholder={t("messagePlaceholder")} />
            <FieldError>{form.fieldError("message")}</FieldError>
          </Field>
        </div>
      </details>
      {/* Champ piège : invisible pour les personnes, rempli par les robots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          Site web
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="sm:col-span-2">
        <FormAlert message={form.formError} />
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">{t("privacy")}</p>
        <Button type="submit" variant="sun" size="touch" disabled={form.pending}>
          {form.pending ? t("sending") : t("submit")}
        </Button>
      </div>
    </form>
  );
}
