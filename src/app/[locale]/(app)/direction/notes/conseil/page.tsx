import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarX2, ClipboardList } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ClassPicker } from "@/features/attendance/components/class-picker";
import { todayInDakar } from "@/features/dashboard/calendar";
import { GradesTabs } from "@/features/evaluations/components/grades-tabs";
import { PeriodTabs } from "@/features/evaluations/components/period-tabs";
import { listPeriods, listSchoolGradebooks, pickPeriod } from "@/features/evaluations/queries";
import { CouncilBoard } from "@/features/grades/components/council-board";
import { PeriodLockCard } from "@/features/grades/components/period-lock-card";
import { getClassCouncil, getPeriodLockStatus } from "@/features/grades/council-queries";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("grades.council");
  return { title: t("title") };
}

type SearchParams = PageProps<"/[locale]/direction/notes/conseil">["searchParams"];

/** Conseil de classe d'une classe (?classe=) sur une période (?periode=), et verrouillage de la période. */
async function Council({ searchParams }: { searchParams: SearchParams }) {
  const [params, { entry }] = await Promise.all([searchParams, requireSpace("direction")]);
  const schoolId = entry.schoolId!;
  const [classes, periods, t] = await Promise.all([
    listSchoolGradebooks(schoolId),
    listPeriods(schoolId),
    getTranslations("evaluations"),
  ]);
  if (classes.length === 0)
    return <EmptyState icon={ClipboardList} title={t("noSchoolClasses")} body={t("noSchoolClassesHint")} />;
  const period = pickPeriod(periods, todayInDakar(), params.periode);
  if (!period) return <EmptyState icon={CalendarX2} title={t("noPeriods")} body={t("noPeriodsHint")} />;

  const klass = classes.find((c) => c.id === params.classe) ?? classes[0]!;
  const [council, lockStatus] = await Promise.all([
    getClassCouncil(schoolId, klass.id, period.id),
    getPeriodLockStatus(schoolId, period.id),
  ]);
  const canManage = permissions.manageAcademics(entry.roles);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ClassPicker label={t("class")} value={klass.id} classes={classes} />
        <PeriodTabs periods={periods} active={period.id} basePath="/direction/notes/conseil" params={{ classe: klass.id }} />
      </div>
      {lockStatus && (
        <PeriodLockCard status={lockStatus} canLock={canManage} canUnlock={permissions.unlockPeriods(entry.roles)} />
      )}
      {council && <CouncilBoard key={`${klass.id}:${period.id}`} data={council} editable={canManage} />}
    </div>
  );
}

export default async function CouncilPage({ searchParams }: PageProps<"/[locale]/direction/notes/conseil">) {
  const t = await getTranslations("grades.council");
  const tNav = await getTranslations("nav");
  return (
    <>
      <PageHeader title={tNav("grades")} description={t("description")} />
      <GradesTabs active="council" />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Council searchParams={searchParams} />
      </Suspense>
    </>
  );
}
