import { Suspense } from "react";
import type { Metadata } from "next";
import { LayoutGrid } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { listTeacherRosters } from "@/features/attendance/queries";
import { ReportForm } from "@/features/reports/components/report-form";
import { ReportList } from "@/features/reports/components/report-list";
import { listMyReports } from "@/features/reports/queries";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("reports") };
}

const card = "rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6";

async function Reports({ searchParams }: { searchParams: PageProps<"/[locale]/professeur/signalements">["searchParams"] }) {
  const [params, { user, entry }] = await Promise.all([searchParams, requireSpace("professeur")]);
  const [rosters, mine, t] = await Promise.all([
    listTeacherRosters(entry.schoolId!, user.id),
    listMyReports(entry.schoolId!, user.id),
    getTranslations("reports"),
  ]);
  if (rosters.length === 0) {
    return <EmptyState icon={LayoutGrid} title={t("noClasses")} body={t("noClassesHint")} />;
  }
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section className={card} aria-labelledby="report-new">
        <h2 id="report-new" className="mb-4 text-lg font-semibold">
          {t("newTitle")}
        </h2>
        <ReportForm
          userId={user.id}
          rosters={rosters}
          defaultClassId={typeof params.classe === "string" ? params.classe : undefined}
        />
      </section>
      <section className={card} aria-labelledby="report-mine">
        <h2 id="report-mine" className="text-lg font-semibold">
          {t("mineTitle")}
        </h2>
        <ReportList reports={mine} showStudent emptyLabel={t("mineEmpty")} />
      </section>
    </div>
  );
}

export default async function TeacherReportsPage({ searchParams }: PageProps<"/[locale]/professeur/signalements">) {
  const t = await getTranslations("reports");
  const tNav = await getTranslations("nav");
  return (
    <>
      <PageHeader title={tNav("reports")} description={t("hint")} />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Reports searchParams={searchParams} />
      </Suspense>
    </>
  );
}
