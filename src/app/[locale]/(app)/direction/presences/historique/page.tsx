import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FilterSelect } from "@/components/data/filter-select";
import { PageHeader } from "@/components/layout/page-header";
import { AttendanceTabs } from "@/features/attendance/components/attendance-tabs";
import { DayNav } from "@/features/attendance/components/day-nav";
import { RollCallLog } from "@/features/attendance/components/roll-call-log";
import { listAttendanceClasses } from "@/features/attendance/direction-queries";
import { isValidDay } from "@/features/attendance/report";
import { todayInDakar } from "@/features/dashboard/calendar";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("attendance") };
}

async function History({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/direction/presences/historique">["searchParams"];
}) {
  const [params, { entry }] = await Promise.all([searchParams, requireSpace("direction")]);
  const [classes, t] = await Promise.all([listAttendanceClasses(entry.schoolId!), getTranslations("attendance.history")]);
  const today = todayInDakar();
  const date = isValidDay(params.date) && params.date <= today ? params.date : today;
  const classId = classes.find((c) => c.id === params.classe)?.id ?? null;
  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <DayNav date={date} today={today} />
        <FilterSelect
          param="classe"
          label={t("classFilter")}
          allLabel={t("allClasses")}
          options={classes.map((c) => ({ value: c.id, label: c.name }))}
        />
      </div>
      <RollCallLog date={date} classId={classId} />
    </>
  );
}

export default async function AttendanceHistoryPage({ searchParams }: PageProps<"/[locale]/direction/presences/historique">) {
  const t = await getTranslations("attendance.history");
  const tNav = await getTranslations("nav");
  return (
    <>
      <PageHeader title={tNav("attendance")} description={t("hint")} />
      <AttendanceTabs active="history" />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <History searchParams={searchParams} />
      </Suspense>
    </>
  );
}
