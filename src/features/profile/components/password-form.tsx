"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { submitForm, useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { changePassword } from "../actions";

/** Changement du mot de passe (comptes e-mail du personnel). */
export function PasswordForm() {
  const t = useTranslations("profile.password");
  const formRef = useRef<HTMLFormElement>(null);
  const form = useActionForm(changePassword, {
    onSuccess: () => {
      formRef.current?.reset();
      toast.success(t("saved"));
    },
  });
  const fields = [
    { name: "current", autoComplete: "current-password" },
    { name: "password", autoComplete: "new-password" },
    { name: "confirm", autoComplete: "new-password" },
  ] as const;

  return (
    <section aria-labelledby="password" className="rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70">
      <h2 id="password" className="text-base font-semibold">
        {t("title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("hint")}</p>
      <form
        ref={formRef}
        noValidate
        className="mt-4 max-w-md space-y-4"
        onSubmit={submitForm((data) =>
          form.run({
            current: String(data.get("current") ?? ""),
            password: String(data.get("password") ?? ""),
            confirm: String(data.get("confirm") ?? ""),
          }),
        )}
      >
        {fields.map(({ name, autoComplete }) => (
          <Field key={name} data-invalid={form.hasError(name) || undefined}>
            <FieldLabel htmlFor={`password-${name}`}>{t(`${name}`)}</FieldLabel>
            <PasswordInput id={`password-${name}`} name={name} autoComplete={autoComplete} required />
            {name === "password" && <FieldDescription>{t("rules")}</FieldDescription>}
            <FieldError>{form.fieldError(name)}</FieldError>
          </Field>
        ))}
        <FormAlert message={form.formError} />
        <Button type="submit" disabled={form.pending}>
          {t("save")}
        </Button>
      </form>
    </section>
  );
}
