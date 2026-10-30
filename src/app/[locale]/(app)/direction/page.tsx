import { Suspense } from "react";
import type { Metadata } from "next";
import { LayoutGrid } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { KpiCard, KpiCardSkeleton } from "@/components/dashboard/kpi-card";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { CalendarCard } from "@/features/dashboard/components/calendar-card";
import { GenderSplit } from "@/features/dashboard/components/gender-split";
import { HeadcountChart } from "@/features/dashboard/components/headcount-chart";
import { SetupBanner } from "@/features/dashboard/components/setup-banner";
import { TodayTasks, TodayTasksSkeleton } from "@/features/dashboard/components/today-tasks";
import { todayInDakar } from "@/features/dashboard/calendar";
import { getDirectionDashboard } from "@/features/dashboard/queries";
import { getTodayTasks } from "@/features/dashboard/today";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("dashboard") };
}

async function dashboard() {
  const { entry } = await requireSpace("direction");
  return getDirectionDashboard(entry.schoolId!);
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

async function Setup() {
  const data = await dashboard();
  return <SetupBanner status={data.setup} />;
}

async function Today() {
  const { user, entry } = await requireSpace("direction");
  const tasks = await getTodayTasks(entry.schoolId!, user.id, entry.roles, todayInDakar());
  return <TodayTasks tasks={tasks} />;
}

async function Kpis() {
  const [data, t] = await Promise.all([dashboard(), getTranslations("dashboard")]);
  return (
    <>
      <KpiCard label={t("students")} value={data.students} tone="lavender" href="/direction/eleves" />
      <KpiCard label={t("teachers")} value={data.teachers} tone="sun" href="/direction/professeurs" />
      <KpiCard label={t("classes")} value={data.classesCount} tone="azure" href="/direction/classes" />
      <KpiCard
        label={t("connectedParents", { total: data.guardians })}
        value={data.connectedGuardians}
        tone="white"
        href="/direction/parents"
      />
    </>
  );
}

async function Headcount() {
  const [data, t] = await Promise.all([dashboard(), getTranslations("dashboard.headcount")]);
  return (
    <section className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <p className="mt-1 mb-5 text-xs text-muted-foreground">
        {data.yearLabel ? t("hint", { year: data.yearLabel }) : t("noYear")}
      </p>
      {data.classes.length === 0 ? (
        <EmptyState icon={LayoutGrid} title={t("empty")} body={t("emptyHint")} />
      ) : (
        <HeadcountChart rows={data.classes} />
      )}
    </section>
  );
}

async function Side() {
  const data = await dashboard();
  return (
    <>
      <GenderSplit girls={data.girls} boys={data.boys} />
      <CalendarCard calendar={data.calendar} />
    </>
  );
}

const card = "rounded-xl bg-white shadow-card ring-1 ring-line/70 animate-pulse";

export default async function DirectionDashboardPage() {
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

      <Suspense fallback={null}>
        <Setup />
      </Suspense>

      <Suspense fallback={<TodayTasksSkeleton />}>
        <Today />
      </Suspense>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4" aria-label={tNav("dashboard")}>
        <Suspense
          fallback={
            <>
              <KpiCardSkeleton tone="lavender" />
              <KpiCardSkeleton tone="sun" />
              <KpiCardSkeleton tone="azure" />
              <KpiCardSkeleton tone="white" />
            </>
          }
        >
          <Kpis />
        </Suspense>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Suspense fallback={<div className={`${card} h-96`} aria-hidden />}>
          <Headcount />
        </Suspense>
        <div className="space-y-6">
          <Suspense
            fallback={
              <>
                <div className={`${card} h-44`} aria-hidden />
                <div className={`${card} h-64`} aria-hidden />
              </>
            }
          >
            <Side />
          </Suspense>
        </div>
      </div>
    </>
  );
}
