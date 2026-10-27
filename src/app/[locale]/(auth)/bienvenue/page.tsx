import { Suspense } from "react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { InstallCard } from "@/components/layout/install-card";
import { ConsentForm } from "@/features/consents/components/consent-form";
import { getMyConsents } from "@/features/consents/queries";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("consents");
  return { title: t("welcomeTitle") };
}

/** Première connexion d'un parent : langue, consentements, installation de l'application. */
async function Welcome() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) redirect({ href: "/connexion", locale });
  const [{ consents }, t] = await Promise.all([getMyConsents(user!.id), getTranslations("consents")]);
  const firstName = user!.fullName?.split(" ")[0];
  return (
    <section className="rounded-2xl bg-white p-6 shadow-float ring-1 ring-line/70 sm:p-8">
      <h1 className="text-2xl font-bold">{firstName ? t("welcomeName", { name: firstName }) : t("welcomeTitle")}</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">{t("welcomeIntro")}</p>
      <ConsentForm initial={consents} mode="welcome" />
      <InstallCard className="mt-6" title={t("install")} />
    </section>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="h-[70vh] animate-pulse rounded-2xl bg-white shadow-float" aria-hidden />}>
      <Welcome />
    </Suspense>
  );
}
