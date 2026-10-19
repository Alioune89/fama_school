import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarDays, Rocket } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { KpiCard, KpiCardSkeleton } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getDirectionCounts } from "@/features/dashboard/queries";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("dashboard") };
}

async function Greeting() {
  const { user, entry } = await requireSpace("direction");
  const t = await getTranslations("dashboard");
  const firstName = user.fullName?.split(" ")[0];
  return (
    <p className="text-sm text-muted-foreground">
      {firstName ? t("welcome", { name: firstName }) : t("welcomeFallback")} · {entry.schoolName}
    </p>
  );
}

async function Kpis() {
  const { entry } = await requireSpace("direction");
  const counts = await getDirectionCounts(entry.schoolId!);
  const t = await getTranslations("dashboard");
  return (
    <>
      <KpiCard label={t("teachers")} value={counts.teachers} tone="lavender" />
      <KpiCard label={t("staff")} value={counts.staff} tone="sun" />
      <KpiCard label={t("parents")} value={counts.parents} tone="lavender" />
      <KpiCard label={t("pendingInvitations")} value={counts.pendingInvitations} tone="sun" />
    </>
  );
}

export default async function DirectionDashboardPage() {
  const t = await getTranslations("dashboard");
  const tNav = await getTranslations("nav");

  return (
    <>
      <PageHeader
        title={tNav("dashboard")}
        description={
          <Suspense fallback={<span className="inline-block h-4 w-48 animate-pulse rounded-full bg-line" />}>
            <Greeting />
          </Suspense>
        }
      />

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4" aria-label={tNav("dashboard")}>
        <Suspense
          fallback={
            <>
              <KpiCardSkeleton tone="lavender" />
              <KpiCardSkeleton tone="sun" />
              <KpiCardSkeleton tone="lavender" />
              <KpiCardSkeleton tone="sun" />
            </>
          }
        >
          <Kpis />
        </Suspense>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-azure-200 via-azure-100 to-lavender-100 p-6 shadow-card sm:p-8">
          <div aria-hidden className="absolute -top-10 -right-10 size-40 rounded-full bg-white/40" />
          <span className="relative flex size-12 items-center justify-center rounded-xl bg-white text-azure-700">
            <Rocket className="size-6" aria-hidden strokeWidth={1.75} />
          </span>
          <h2 className="relative mt-4 text-xl font-bold">{t("setupTitle")}</h2>
          <p className="relative mt-2 max-w-xl text-sm text-ink-soft">{t("setupBody")}</p>
          <Link href="/direction/parametres" className={`${buttonVariants()} relative mt-6`}>
            {t("setupAction")}
          </Link>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
          <h2 className="text-lg font-semibold">{t("agenda")}</h2>
          <div className="mt-6 flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-sun-100 text-sun-700">
              <CalendarDays className="size-6" aria-hidden strokeWidth={1.75} />
            </span>
            <p className="text-sm text-muted-foreground">{t("agendaEmpty")}</p>
          </div>
        </section>
      </div>
    </>
  );
}
