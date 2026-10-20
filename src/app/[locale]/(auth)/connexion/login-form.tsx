"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useOffline } from "next/offline";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendPhoneCode, signInWithEmail } from "@/features/auth/actions";
import type { AuthErrorCode } from "@/features/auth/errors";
import { useRouter } from "@/i18n/navigation";
import { submitForm } from "@/components/forms/use-action-form";

export function LoginForm() {
  const t = useTranslations("auth");
  const tOffline = useTranslations("offline");
  const locale = useLocale();
  const router = useRouter();
  const next = useSearchParams().get("suite");
  const isOffline = useOffline();
  const [pending, startTransition] = useTransition();
  const [phoneError, setPhoneError] = useState<AuthErrorCode | null>(null);
  const [emailError, setEmailError] = useState<AuthErrorCode | null>(null);

  const submitPhone = (formData: FormData) => {
    setPhoneError(null);
    startTransition(async () => {
      const result = await sendPhoneCode({ phone: String(formData.get("phone") ?? "") });
      if (!result.ok) {
        setPhoneError(result.error);
        return;
      }
      const query: Record<string, string> = { tel: result.data.phone };
      if (next) query.suite = next;
      router.push({ pathname: "/connexion/code", query });
    });
  };

  const submitEmail = (formData: FormData) => {
    setEmailError(null);
    startTransition(async () => {
      const result = await signInWithEmail({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        next,
        locale,
      });
      if (result && !result.ok) setEmailError(result.error);
    });
  };

  const pendingLabel = isOffline ? tOffline("waiting") : null;

  return (
    <Tabs defaultValue="phone">
      <TabsList className="grid h-11 w-full grid-cols-2 rounded-full bg-muted p-1">
        <TabsTrigger value="phone" className="rounded-full data-active:shadow-card">
          {t("tabPhone")}
        </TabsTrigger>
        <TabsTrigger value="email" className="rounded-full data-active:shadow-card">
          {t("tabEmail")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="phone" className="pt-4">
        <form onSubmit={submitForm(submitPhone)} className="space-y-5" noValidate>
          <Field data-invalid={phoneError ? true : undefined}>
            <FieldLabel htmlFor="phone">{t("phoneLabel")}</FieldLabel>
            <div className="flex items-stretch gap-2">
              <span className="inline-flex h-11 shrink-0 items-center rounded-xl border border-input bg-muted px-3 text-sm font-semibold whitespace-nowrap text-ink-soft" aria-hidden>
                🇸🇳 +221
              </span>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder={t("phonePlaceholder")}
                aria-invalid={phoneError ? true : undefined}
                aria-describedby="phone-hint"
                required
                className="tabular text-base"
              />
            </div>
            <FieldDescription id="phone-hint">{t("phoneHint")}</FieldDescription>
            {phoneError && <FieldError>{t(`errors.${phoneError}`)}</FieldError>}
          </Field>
          <Button type="submit" size="touch" className="w-full" disabled={pending}>
            {pending ? (pendingLabel ?? t("sendCode")) : t("sendCode")}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="email" className="pt-4">
        <form onSubmit={submitForm(submitEmail)} className="space-y-5" noValidate>
          <Field data-invalid={emailError === "invalidEmail" ? true : undefined}>
            <FieldLabel htmlFor="email">{t("emailLabel")}</FieldLabel>
            <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
          </Field>
          <Field data-invalid={emailError === "passwordRequired" ? true : undefined}>
            <FieldLabel htmlFor="password">{t("passwordLabel")}</FieldLabel>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          {emailError && <FieldError>{t(`errors.${emailError}`)}</FieldError>}
          <Button type="submit" size="touch" className="w-full" disabled={pending}>
            {pending ? (pendingLabel ?? t("signInEmail")) : t("signInEmail")}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}

export function LoginFormSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="h-11 animate-pulse rounded-full bg-muted" />
      <div className="h-4 w-40 animate-pulse rounded-full bg-muted" />
      <div className="h-11 animate-pulse rounded-xl bg-muted" />
      <div className="h-12 animate-pulse rounded-full bg-muted" />
    </div>
  );
}
