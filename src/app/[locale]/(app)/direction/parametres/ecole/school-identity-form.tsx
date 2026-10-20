"use client";

import { useRef, useState, useTransition } from "react";
import { ImageUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { submitForm, useActionForm, useMessage } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { saveSchoolIdentity, uploadSchoolLogo } from "@/features/setup/actions";
import { useRouter } from "@/i18n/navigation";
import { formatPhone } from "@/lib/phone";

type Defaults = { name: string; shortName: string; city: string; region: string; address: string; phone: string; email: string };

export function SchoolIdentityForm({
  defaults,
  canEdit,
  nextHref,
  logoUrl,
}: {
  defaults: Defaults;
  canEdit: boolean;
  nextHref: string;
  logoUrl: string | null;
}) {
  const t = useTranslations("setup");
  const router = useRouter();
  const message = useMessage();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const [logoError, setLogoError] = useState<string | null>(null);

  const form = useActionForm(saveSchoolIdentity, {
    onSuccess: () => {
      toast.success(t("saved"));
      router.push(nextHref);
    },
  });

  const onLogo = (file: File | undefined) => {
    if (!file) return;
    setLogoError(null);
    const data = new FormData();
    data.set("logo", file);
    startUpload(async () => {
      const result = await uploadSchoolLogo(data);
      if (result.ok) toast.success(t("school.logoUpdated"));
      else setLogoError(result.error);
    });
  };

  const input = (name: keyof Defaults, props: React.ComponentProps<typeof Input> = {}) => (
    <Input
      id={name}
      name={name}
      defaultValue={name === "phone" ? formatPhone(defaults.phone) : defaults[name]}
      disabled={!canEdit}
      aria-invalid={form.hasError(name) || undefined}
      {...props}
    />
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <form
        noValidate
        className="grid gap-5 rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70 sm:grid-cols-2"
        onSubmit={submitForm((formData) =>
          form.run({
            name: String(formData.get("name") ?? ""),
            shortName: String(formData.get("shortName") ?? ""),
            city: String(formData.get("city") ?? ""),
            region: String(formData.get("region") ?? ""),
            address: String(formData.get("address") ?? ""),
            phone: String(formData.get("phone") ?? ""),
            email: String(formData.get("email") ?? ""),
          }))}
      >
        {!canEdit && <p className="rounded-xl bg-azure-50 px-4 py-3 text-sm text-azure-800 sm:col-span-2">{t("readOnly")}</p>}
        <Field className="sm:col-span-2" data-invalid={form.hasError("name") || undefined}>
          <FieldLabel htmlFor="name">{t("school.name")}</FieldLabel>
          {input("name", { required: true })}
          <FieldError>{form.fieldError("name")}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="shortName">{t("school.shortName")}</FieldLabel>
          {input("shortName")}
          <FieldDescription>{t("school.shortNameHint")}</FieldDescription>
        </Field>
        <Field data-invalid={form.hasError("city") || undefined}>
          <FieldLabel htmlFor="city">{t("school.city")}</FieldLabel>
          {input("city", { required: true })}
          <FieldError>{form.fieldError("city")}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="region">{t("school.region")}</FieldLabel>
          {input("region")}
        </Field>
        <Field>
          <FieldLabel htmlFor="address">{t("school.address")}</FieldLabel>
          {input("address")}
        </Field>
        <Field data-invalid={form.hasError("phone") || undefined}>
          <FieldLabel htmlFor="phone">{t("school.phone")}</FieldLabel>
          {input("phone", { type: "tel", inputMode: "tel", required: true, placeholder: "33 800 00 00" })}
          <FieldError>{form.fieldError("phone")}</FieldError>
        </Field>
        <Field data-invalid={form.hasError("email") || undefined}>
          <FieldLabel htmlFor="email">{t("school.email")}</FieldLabel>
          {input("email", { type: "email", inputMode: "email" })}
          <FieldError>{form.fieldError("email")}</FieldError>
        </Field>
        <div className="sm:col-span-2">
          <FormAlert message={form.formError} />
        </div>
        {canEdit && (
          <div className="sm:col-span-2">
            <Button type="submit" size="lg" disabled={form.pending}>
              {t("saveAndContinue")}
            </Button>
          </div>
        )}
      </form>

      <section className="flex flex-col items-center gap-4 rounded-xl bg-white p-6 text-center shadow-card ring-1 ring-line/70">
        <h2 className="self-start text-base font-semibold">{t("school.logo")}</h2>
        <div className="flex size-32 items-center justify-center overflow-hidden rounded-2xl bg-azure-50 ring-1 ring-line">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo servi par le stockage public Supabase
            <img src={logoUrl} alt={t("school.logo")} className="size-full object-contain p-2" />
          ) : (
            <ImageUp className="size-10 text-azure-600" aria-hidden strokeWidth={1.5} />
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t("school.logoHint")}</p>
        {logoError && <p role="alert" className="text-sm text-destructive">{message(logoError)}</p>}
        {canEdit && (
          <>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="sr-only"
              onChange={(event) => onLogo(event.target.files?.[0])}
              aria-label={t("school.logoUpload")}
            />
            <Button type="button" variant="outline" onClick={() => fileInput.current?.click()} disabled={uploading}>
              <ImageUp aria-hidden />
              {t("school.logoUpload")}
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
