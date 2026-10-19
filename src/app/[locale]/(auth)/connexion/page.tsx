import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm, LoginFormSkeleton } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("title") };
}

export default async function LoginPage() {
  const t = await getTranslations("auth");
  return (
    <section className="rounded-2xl bg-white p-6 shadow-float ring-1 ring-line/70 sm:p-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-6">
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>
      </div>
    </section>
  );
}
