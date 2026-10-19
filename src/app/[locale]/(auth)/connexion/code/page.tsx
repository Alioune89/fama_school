import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OtpForm, OtpFormSkeleton } from "./otp-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("codeTitle") };
}

export default function CodePage() {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-float ring-1 ring-line/70 sm:p-8">
      <Suspense fallback={<OtpFormSkeleton />}>
        <OtpForm />
      </Suspense>
    </section>
  );
}
