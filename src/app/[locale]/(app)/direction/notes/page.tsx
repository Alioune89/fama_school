import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarX2, ClipboardList } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ClassPicker } from "@/features/attendance/components/class-picker";
import { todayInDakar } from "@/features/dashboard/calendar";
import { ClassGradebook } from "@/features/evaluations/components/class-gradebook";
import { GradesTabs } from "@/features/evaluations/components/grades-tabs";
import { PeriodTabs } from "@/features/evaluations/components/period-tabs";
import { listEvaluations, listPeriods, listSchoolGradebooks, pickPeriod } from "@/features/evaluations/queries";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("grades") };
}

type SearchParams = PageProps<"/[locale]/direction/notes">["searchParams"];

/** Évaluations d'une classe (?classe=) sur une période (?periode=). */
async function Evaluations({ searchParams }: { searchParams: SearchParams }) {
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
  const evaluations = await listEvaluations(schoolId, period.id, { classIds: [klass.id] });
  // La direction pédagogique gère les évaluations ; les autres rôles les consultent.
  const readOnlyPeriod = permissions.manageAcademics(entry.roles) ? period : { ...period, locked: true };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ClassPicker label={t("class")} value={klass.id} classes={classes} />
        <PeriodTabs periods={periods} active={period.id} basePath="/direction/notes" params={{ classe: klass.id }} />
      </div>
      <ClassGradebook
        klass={klass}
        evaluations={evaluations}
        periods={periods}
        period={readOnlyPeriod}
        basePath="/direction/notes"
      />
    </div>
  );
}

export default async function GradesPage({ searchParams }: PageProps<"/[locale]/direction/notes">) {
  const t = await getTranslations("evaluations");
  const tNav = await getTranslations("nav");
  return (
    <>
      <PageHeader title={tNav("grades")} description={t("directionHint")} />
      <GradesTabs active="evaluations" />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Evaluations searchParams={searchParams} />
      </Suspense>
    </>
  );
}
