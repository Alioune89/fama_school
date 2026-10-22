import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarX2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { todayInDakar } from "@/features/dashboard/calendar";
import { GradesTabs } from "@/features/evaluations/components/grades-tabs";
import { PeriodTabs } from "@/features/evaluations/components/period-tabs";
import { ScheduleCompositionSheet, type ScheduleSubject } from "@/features/evaluations/components/schedule-composition-sheet";
import { listEvaluations, listPeriods, listSchoolGradebooks, pickPeriod } from "@/features/evaluations/queries";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("grades") };
}

type SearchParams = PageProps<"/[locale]/direction/notes/compositions">["searchParams"];

/** Calendrier des compositions d'une période : par date, puis par matière, avec les classes concernées. */
async function Calendar({ searchParams }: { searchParams: SearchParams }) {
  const [params, { entry }] = await Promise.all([searchParams, requireSpace("direction")]);
  const schoolId = entry.schoolId!;
  const [classes, periods, t] = await Promise.all([
    listSchoolGradebooks(schoolId),
    listPeriods(schoolId),
    getTranslations("evaluations"),
  ]);
  const period = pickPeriod(periods, todayInDakar(), params.periode);
  if (!period) return <EmptyState icon={CalendarX2} title={t("noPeriods")} body={t("noPeriodsHint")} />;
  const compositions = await listEvaluations(schoolId, period.id, { kind: "composition" });

  const className = new Map(classes.map((c) => [c.id, c.name]));
  const classOrder = new Map(classes.map((c, index) => [c.id, index]));
  const subjectName = new Map(classes.flatMap((c) => c.subjects.map((s) => [s.id, s.name] as const)));
  const subjects = new Map<string, ScheduleSubject>();
  for (const klass of classes) {
    for (const subject of klass.subjects) {
      const entrySubject = subjects.get(subject.id) ?? { id: subject.id, name: subject.name, classes: [] };
      entrySubject.classes.push({ id: klass.id, name: klass.name });
      subjects.set(subject.id, entrySubject);
    }
  }

  // date → matière → classes
  const days = new Map<string, Map<string, string[]>>();
  for (const composition of compositions) {
    const day = days.get(composition.heldOn) ?? new Map<string, string[]>();
    day.set(composition.subjectId, [...(day.get(composition.subjectId) ?? []), composition.classId]);
    days.set(composition.heldOn, day);
  }
  const canSchedule = permissions.manageAcademics(entry.roles) && !period.locked;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PeriodTabs periods={periods} active={period.id} basePath="/direction/notes/compositions" />
        {canSchedule && (
          <ScheduleCompositionSheet
            subjects={[...subjects.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"))}
            period={period}
          />
        )}
      </div>
      {days.size === 0 ? (
        <EmptyState icon={CalendarX2} title={t("noCompositions", { period: period.label })} body={t("noCompositionsHint")} />
      ) : (
        <ol className="space-y-4" aria-label={t("calendarLabel", { period: period.label })}>
          {[...days.entries()].map(([date, bySubject]) => (
            <li key={date} className="rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70">
              <h2 className="font-semibold text-ink first-letter:uppercase">
                {formatDate(date, { weekday: "long", day: "numeric", month: "long" })}
              </h2>
              <ul className="mt-3 divide-y divide-line">
                {[...bySubject.entries()].map(([subjectId, classIds]) => (
                  <li key={subjectId} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
                    <span className="min-w-36 font-medium text-ink">{subjectName.get(subjectId) ?? ""}</span>
                    <span className="flex flex-wrap gap-1.5">
                      {[...classIds]
                        .sort((a, b) => (classOrder.get(a) ?? 0) - (classOrder.get(b) ?? 0))
                        .map((id) => (
                          <span key={id} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
                            {className.get(id) ?? ""}
                          </span>
                        ))}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default async function CompositionsPage({ searchParams }: PageProps<"/[locale]/direction/notes/compositions">) {
  const t = await getTranslations("evaluations");
  const tNav = await getTranslations("nav");
  return (
    <>
      <PageHeader title={tNav("grades")} description={t("compositionsHint")} />
      <GradesTabs active="compositions" />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Calendar searchParams={searchParams} />
      </Suspense>
    </>
  );
}
