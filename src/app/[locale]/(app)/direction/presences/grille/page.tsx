import { Suspense } from "react";
import type { Metadata } from "next";
import { ClipboardCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { AttendanceTabs } from "@/features/attendance/components/attendance-tabs";
import { ClassPicker } from "@/features/attendance/components/class-picker";
import { MonthGridTable, MonthNav } from "@/features/attendance/components/month-grid";
import { getMonthGrid, listAttendanceClasses } from "@/features/attendance/direction-queries";
import { isValidMonth } from "@/features/attendance/report";
import { todayInDakar } from "@/features/dashboard/calendar";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("attendance") };
}

async function Grid({ searchParams }: { searchParams: PageProps<"/[locale]/direction/presences/grille">["searchParams"] }) {
  const [params, { entry }] = await Promise.all([searchParams, requireSpace("direction")]);
  const [classes, t] = await Promise.all([listAttendanceClasses(entry.schoolId!), getTranslations("attendance.direction")]);
  if (classes.length === 0) return <EmptyState icon={ClipboardCheck} title={t("noClasses")} body={t("noClassesHint")} />;

  const today = todayInDakar();
  const currentMonth = today.slice(0, 7);
  const month = isValidMonth(params.mois) && params.mois <= currentMonth ? params.mois : currentMonth;
  const klass = classes.find((c) => c.id === params.classe) ?? classes[0]!;
  const grid = await getMonthGrid(entry.schoolId!, klass.id, month, today);

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ClassPicker label={t("class")} value={klass.id} classes={classes} />
        <MonthNav classId={klass.id} month={month} currentMonth={currentMonth} />
      </div>
      <MonthGridTable grid={grid} />
    </>
  );
}

export default async function AttendanceGridPage({ searchParams }: PageProps<"/[locale]/direction/presences/grille">) {
  const t = await getTranslations("attendance.direction");
  const tNav = await getTranslations("nav");
  return (
    <>
      <PageHeader title={tNav("attendance")} description={t("gridHint")} />
      <AttendanceTabs active="grid" />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Grid searchParams={searchParams} />
      </Suspense>
    </>
  );
}
