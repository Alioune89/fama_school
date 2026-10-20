"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { submitForm, useActionForm } from "@/components/forms/use-action-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { createSchool } from "@/features/platform/actions";
import { SCHOOL_PLANS } from "@/features/platform/schemas";
import { Link, useRouter } from "@/i18n/navigation";
import { slugify } from "@/lib/slug";

export function CreateSchoolForm() {
  const t = useTranslations("platform");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  const form = useActionForm(createSchool, {
    onSuccess: () => {
      toast.success(t("create.success"));
      router.push("/plateforme");
    },
  });

  const field = (name: string) => ({
    "aria-invalid": form.hasError(name) ? true : undefined,
  });

  return (
    <form
      className="grid max-w-3xl gap-6"
      noValidate
      onSubmit={submitForm((formData) =>
        form.run({
          name: String(formData.get("name") ?? ""),
          slug: String(formData.get("slug") ?? ""),
          city: String(formData.get("city") ?? ""),
          region: String(formData.get("region") ?? ""),
          plan: String(formData.get("plan") ?? "") as (typeof SCHOOL_PLANS)[number],
          directorName: String(formData.get("directorName") ?? ""),
          directorPhone: String(formData.get("directorPhone") ?? ""),
          directorEmail: String(formData.get("directorEmail") ?? ""),
        }))}
    >
      <section className="grid gap-5 rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70 sm:grid-cols-2">
        <h2 className="text-lg font-semibold sm:col-span-2">{t("create.schoolSection")}</h2>
        <Field className="sm:col-span-2" data-invalid={form.hasError("name") || undefined}>
          <FieldLabel htmlFor="name">{t("create.name")}</FieldLabel>
          <Input
            id="name"
            name="name"
            required
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!slugEdited) setSlug(slugify(event.target.value));
            }}
            {...field("name")}
          />
          <FieldError>{form.fieldError("name")}</FieldError>
        </Field>
        <Field data-invalid={form.hasError("slug") || undefined}>
          <FieldLabel htmlFor="slug">{t("create.slug")}</FieldLabel>
          <Input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value);
            }}
            {...field("slug")}
          />
          <FieldDescription>{t("create.slugHint", { slug: slug || "…" })}</FieldDescription>
          <FieldError>{form.fieldError("slug")}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="plan">{t("columns.plan")}</FieldLabel>
          <NativeSelect id="plan" name="plan" defaultValue="pilot">
            {SCHOOL_PLANS.map((plan) => (
              <option key={plan} value={plan}>
                {t(`plans.${plan}`)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="city">{t("columns.city")}</FieldLabel>
          <Input id="city" name="city" />
        </Field>
        <Field>
          <FieldLabel htmlFor="region">{t("create.region")}</FieldLabel>
          <Input id="region" name="region" defaultValue="Dakar" />
        </Field>
      </section>

      <section className="grid gap-5 rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <h2 className="text-lg font-semibold">{t("create.directorSection")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("create.directorHint")}</p>
        </div>
        <Field className="sm:col-span-2" data-invalid={form.hasError("directorName") || undefined}>
          <FieldLabel htmlFor="directorName">{t("create.directorName")}</FieldLabel>
          <Input id="directorName" name="directorName" required autoComplete="off" {...field("directorName")} />
          <FieldError>{form.fieldError("directorName")}</FieldError>
        </Field>
        <Field data-invalid={form.hasError("directorPhone") || undefined}>
          <FieldLabel htmlFor="directorPhone">{t("create.directorPhone")}</FieldLabel>
          <Input id="directorPhone" name="directorPhone" type="tel" inputMode="tel" placeholder="77 123 45 67" {...field("directorPhone")} />
          <FieldError>{form.fieldError("directorPhone")}</FieldError>
        </Field>
        <Field data-invalid={form.hasError("directorEmail") || undefined}>
          <FieldLabel htmlFor="directorEmail">{t("create.directorEmail")}</FieldLabel>
          <Input id="directorEmail" name="directorEmail" type="email" inputMode="email" {...field("directorEmail")} />
          <FieldError>{form.fieldError("directorEmail")}</FieldError>
        </Field>
      </section>

      <FormAlert message={form.formError} />

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={form.pending}>
          {t("create.submit")}
        </Button>
        <Link href="/plateforme" className={buttonVariants({ variant: "outline", size: "lg" })}>
          {tCommon("cancel")}
        </Link>
      </div>
    </form>
  );
}
