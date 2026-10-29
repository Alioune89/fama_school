import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, Download, NotebookText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { todayInDakar } from "@/features/dashboard/calendar";
import { ReportList } from "@/features/daily-reports/components/report-list";
import { listWeekReports } from "@/features/daily-reports/queries";
import { shiftDays, weekStart } from "@/features/daily-reports/week";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("dailyReports") };
}

type SearchParams = PageProps<"/[locale]/direction/rapports">["searchParams"];

/** Rapports journaliers des professeurs, semaine par semaine (?semaine=lundi), et leur compilation en PDF. */
async function Reports({ searchParams }: { searchParams: SearchParams }) {
  const [params, { entry }, t] = await Promise.all([searchParams, requireSpace("direction"), getTranslations("dailyReports")]);
  const today = todayInDakar();
  const requested = typeof params.semaine === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.semaine) ? params.semaine : today;
  const monday = weekStart(requested);
  const reports = await listWeekReports(entry.schoolId!, monday);
  const label = t("week", {
    from: formatDate(monday, { day: "numeric", month: "long" }),
    to: formatDate(shiftDays(monday, 6), { day: "numeric", month: "long" }),
  });
  const days = [...new Set(reports.map((r) => r.reportDate))].reverse();
  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("directionDescription")}
        actions={
          reports.length > 0 && (
            <a href={`/api/rapports?semaine=${monday}`} className={buttonVariants({ variant: "outline" })}>
              <Download aria-hidden />
              {t("download")}
            </a>
          )
        }
      />
      <nav aria-label={t("weekNav")} className="mb-5 flex items-center gap-2">
        <Link
          href={`/direction/rapports?semaine=${shiftDays(monday, -7)}`}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
          aria-label={t("previousWeek")}
        >
          <ChevronLeft aria-hidden />
        </Link>
        <p className="min-w-0 flex-1 text-center text-sm font-semibold sm:flex-none">{label}</p>
        {monday < weekStart(today) && (
          <Link
            href={`/direction/rapports?semaine=${shiftDays(monday, 7)}`}
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            aria-label={t("nextWeek")}
          >
            <ChevronRight aria-hidden />
          </Link>
        )}
      </nav>
      {reports.length === 0 ? (
        <EmptyState icon={NotebookText} title={t("emptyWeek")} body={t("emptyWeekHint")} />
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <section key={day} aria-labelledby={`day-${day}`}>
              <h2 id={`day-${day}`} className="mb-2 text-base font-semibold first-letter:uppercase">
                {formatDate(day, { weekday: "long", day: "numeric", month: "long" })}
              </h2>
              <ReportList reports={reports.filter((r) => r.reportDate === day)} showAuthor />
            </section>
          ))}
        </div>
      )}
    </>
  );
}

export default function DirectionReportsPage({ searchParams }: PageProps<"/[locale]/direction/rapports">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
      <Reports searchParams={searchParams} />
    </Suspense>
  );
}
