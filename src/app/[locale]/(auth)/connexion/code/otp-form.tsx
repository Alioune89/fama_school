"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { sendPhoneCode, verifyPhoneCode } from "@/features/auth/actions";
import type { AuthErrorCode } from "@/features/auth/errors";
import { Link, useRouter } from "@/i18n/navigation";
import { formatPhone } from "@/lib/phone";

const RESEND_DELAY_SECONDS = 30;

export function OtpForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("tel") ?? "";
  const next = searchParams.get("suite");

  const [code, setCode] = useState("");
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [pending, startTransition] = useTransition();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_DELAY_SECONDS);
  const submittedCode = useRef<string | null>(null);

  useEffect(() => {
    if (!phone) router.replace("/connexion");
  }, [phone, router]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const verify = (value: string) => {
    if (value.length !== 6 || submittedCode.current === value) return;
    submittedCode.current = value;
    setError(null);
    startTransition(async () => {
      const result = await verifyPhoneCode({ phone, code: value, next, locale });
      if (result && !result.ok) {
        setError(result.error);
        setCode("");
        submittedCode.current = null;
      }
    });
  };

  const resend = () => {
    startTransition(async () => {
      const result = await sendPhoneCode({ phone });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSecondsLeft(RESEND_DELAY_SECONDS);
      toast.success(t("codeSent"));
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("codeTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("codeSubtitle", { phone: formatPhone(phone) })}</p>

      <form
        className="mt-8 space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          verify(code);
        }}
      >
        <div className="space-y-2">
          <label htmlFor="otp" className="text-sm font-medium text-ink">
            {t("codeLabel")}
          </label>
          <InputOTP
            id="otp"
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onChange={(value) => {
              setCode(value);
              if (value.length === 6) verify(value);
            }}
            disabled={pending}
            aria-invalid={error ? true : undefined}
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, index) => (
                <InputOTPSlot key={index} index={index} aria-invalid={error ? true : undefined} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {error && <FieldError>{t(`errors.${error}`)}</FieldError>}
        </div>

        <Button type="submit" size="touch" className="w-full" disabled={pending || code.length !== 6}>
          {t("verify")}
        </Button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href="/connexion" className="font-medium text-primary hover:underline">
          {t("changeNumber")}
        </Link>
        <button
          type="button"
          onClick={resend}
          disabled={secondsLeft > 0 || pending}
          className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
        >
          {secondsLeft > 0 ? t("resendIn", { seconds: secondsLeft }) : t("resend")}
        </button>
      </div>
    </div>
  );
}

export function OtpFormSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="h-7 w-56 animate-pulse rounded-full bg-muted" />
      <div className="h-4 w-72 animate-pulse rounded-full bg-muted" />
      <div className="flex gap-0">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="size-12 animate-pulse border border-white bg-muted first:rounded-l-xl last:rounded-r-xl" />
        ))}
      </div>
      <div className="h-12 animate-pulse rounded-full bg-muted" />
    </div>
  );
}
