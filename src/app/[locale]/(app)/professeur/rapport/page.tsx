import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { todayInDakar } from "@/features/dashboard/calendar";
import { DailyReportForm } from "@/features/daily-reports/components/daily-report-form";
import { ReportList } from "@/features/daily-reports/components/report-list";
import { listMyReports } from "@/features/daily-reports/queries";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("dailyReport") };
}

/** Rapport du jour du professeur (texte et/ou note vocale) et ses rapports des deux dernières semaines. */
async function DailyReport() {
  const { user, entry } = await requireSpace("professeur");
  const schoolId = entry.schoolId!;
  const [reports, t] = await Promise.all([listMyReports(schoolId, user.id), getTranslations("dailyReports")]);
  const today = todayInDakar();
  const current = reports.find((r) => r.reportDate === today) ?? null;
  const past = reports.filter((r) => r.reportDate !== today);
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <DailyReportForm
        schoolId={schoolId}
        userId={user.id}
        initial={
          current
            ? {
                body: current.body ?? "",
                audio:
                  current.audioPath && current.audioUrl
                    ? { url: current.audioUrl, path: current.audioPath, seconds: current.audioSeconds ?? 1 }
                    : null,
              }
            : null
        }
      />
      <section aria-labelledby="past-reports">
        <h2 id="past-reports" className="mb-3 text-base font-semibold">
          {t("pastTitle")}
        </h2>
        {past.length === 0 ? <p className="text-sm text-muted-foreground">{t("noPast")}</p> : <ReportList reports={past} />}
      </section>
    </div>
  );
}

export default async function TeacherDailyReportPage() {
  const t = await getTranslations("dailyReports");
  return (
    <>
      <PageHeader title={t("title")} description={t("teacherDescription")} />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <DailyReport />
      </Suspense>
    </>
  );
}
