import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarX2, ClipboardList } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { todayInDakar } from "@/features/dashboard/calendar";
import { ClassGradebook } from "@/features/evaluations/components/class-gradebook";
import { PeriodTabs } from "@/features/evaluations/components/period-tabs";
import { listEvaluations, listPeriods, listTeacherGradebooks, pickPeriod } from "@/features/evaluations/queries";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("gradeEntry") };
}

type SearchParams = PageProps<"/[locale]/professeur/notes">["searchParams"];

/** Évaluations de l'enseignant : une classe à la fois (?classe=), sur une période (?periode=). */
async function TeacherEvaluations({ searchParams }: { searchParams: SearchParams }) {
  const [params, { user, entry }] = await Promise.all([searchParams, requireSpace("professeur")]);
  const schoolId = entry.schoolId!;
  const [gradebooks, periods, t] = await Promise.all([
    listTeacherGradebooks(schoolId, user.id),
    listPeriods(schoolId),
    getTranslations("evaluations"),
  ]);
  if (gradebooks.length === 0) return <EmptyState icon={ClipboardList} title={t("noClasses")} body={t("noClassesHint")} />;
  const period = pickPeriod(periods, todayInDakar(), params.periode);
  if (!period) return <EmptyState icon={CalendarX2} title={t("noPeriods")} body={t("noPeriodsHint")} />;

  const klass = gradebooks.find((c) => c.id === params.classe) ?? gradebooks[0]!;
  const evaluations = await listEvaluations(schoolId, period.id, { classIds: [klass.id] });

  return (
    <div className="space-y-5">
      <PeriodTabs periods={periods} active={period.id} basePath="/professeur/notes" params={{ classe: klass.id }} />
      {gradebooks.length > 1 && (
        <nav aria-label={t("classesLabel")} className="flex flex-wrap gap-2">
          {gradebooks.map((c) => (
            <Link
              key={c.id}
              href={`/professeur/notes?classe=${c.id}&periode=${period.id}`}
              aria-current={c.id === klass.id ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition-colors",
                c.id === klass.id ? "bg-azure-100 text-ink ring-azure-500" : "bg-white text-ink-soft ring-line hover:text-ink",
              )}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      )}
      <ClassGradebook klass={klass} evaluations={evaluations} periods={periods} period={period} basePath="/professeur/notes" />
    </div>
  );
}

export default async function TeacherGradesPage({ searchParams }: PageProps<"/[locale]/professeur/notes">) {
  const t = await getTranslations("evaluations");
  const tNav = await getTranslations("nav");
  return (
    <>
      <PageHeader title={tNav("gradeEntry")} description={t("teacherHint")} />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <TeacherEvaluations searchParams={searchParams} />
      </Suspense>
    </>
  );
}
