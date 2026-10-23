import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, CircleCheck, FileCheck, FileText, LogOut } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PersonAvatar } from "@/components/people/person-avatar";
import { listArrivals, listDepartures } from "@/features/arrivals/queries";
import { todayInDakar } from "@/features/dashboard/calendar";
import { ChildGrades } from "@/features/grades/components/child-grades";
import { listChildGrades } from "@/features/grades/queries";
import { JustificationList } from "@/features/justifications/components/justification-list";
import { listStudentJustifications } from "@/features/justifications/queries";
import { AbsenceList } from "@/features/parent/components/absence-list";
import { listChildrenAbsences, listMyChildren, PARENT_WINDOW_DAYS, parentWindowStart } from "@/features/parent/queries";
import { listStudentReportCards } from "@/features/report-cards/queries";
import { ReportList } from "@/features/reports/components/report-list";
import { listStudentReports } from "@/features/reports/queries";
import { Link } from "@/i18n/navigation";
import { formatDate, formatTime } from "@/lib/format";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("children") };
}

const card = "rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6";

/** Fiche d'un enfant pour son parent : notes publiées, signalements des enseignants, absences, retards et justificatifs. */
async function ChildDetail({ params }: { params: PageProps<"/[locale]/parent/enfants/[id]">["params"] }) {
  const [{ id }, { user }] = await Promise.all([params, requireSpace("parent")]);
  const child = (await listMyChildren(user.id)).find((c) => c.id === id);
  if (!child) notFound();

  const today = todayInDakar();
  const from = parentWindowStart(today);
  const [reportCards, grades, reports, absences, justifications, arrivals, departures, t, tArrivals] = await Promise.all([
    listStudentReportCards(child.id),
    listChildGrades(child.id, child.schoolId, today),
    listStudentReports(child.id),
    listChildrenAbsences([child.id], from),
    listStudentJustifications([child.id], from),
    listArrivals({ studentIds: [child.id] }, today),
    listDepartures({ studentIds: [child.id] }, today),
    getTranslations("parentSpace"),
    getTranslations("arrivals"),
  ]);
  const arrivedAt = arrivals.get(child.id);
  const leftAt = departures.get(child.id);
  const name = `${child.firstName} ${child.lastName}`;

  return (
    <>
      <section className="mb-6 flex items-center gap-4">
        <PersonAvatar name={name} size="lg" />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="text-sm text-muted-foreground">{[child.className, child.schoolName].filter(Boolean).join(" · ")}</p>
          {arrivedAt && (
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-success-700">
              <CircleCheck className="size-4" aria-hidden />
              {tArrivals("parentArrivedToday", { time: formatTime(arrivedAt) })}
            </p>
          )}
          {leftAt && (
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-azure-700">
              <LogOut className="size-4" aria-hidden />
              {tArrivals("parentLeftToday", { time: formatTime(leftAt) })}
            </p>
          )}
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${card} lg:col-span-2`} aria-labelledby="child-report-cards">
          <h2 id="child-report-cards" className="text-lg font-semibold">
            {t("reportCardsTitle")}
          </h2>
          {reportCards.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{t("reportCardsEmpty", { name: child.firstName })}</p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {reportCards.map((reportCard) => (
                <li key={reportCard.id}>
                  <Link
                    href={`/parent/enfants/${child.id}/bulletins/${reportCard.id}`}
                    className="flex items-center gap-3 rounded-lg bg-azure-50/60 px-4 py-3 ring-1 ring-line/70 hover:bg-azure-50"
                  >
                    <FileText className="size-5 shrink-0 text-azure-700" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">
                        {t("reportCardOpen", { period: reportCard.data.periodLabel })}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {t("reportCardPublished", {
                          date: formatDate(reportCard.publishedAt!, { day: "numeric", month: "long" }),
                        })}
                      </span>
                    </span>
                    <ChevronRight className="size-4 text-ink-soft" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className={`${card} lg:col-span-2`} aria-labelledby="child-grades">
          <ChildGrades data={grades} firstName={child.firstName} />
        </section>
        <section className={card} aria-labelledby="child-reports">
          <h2 id="child-reports" className="text-lg font-semibold">
            {t("reportsTitle")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("reportsHint")}</p>
          <ReportList reports={reports} emptyLabel={t("reportsEmpty", { name: child.firstName })} />
        </section>
        <section className={card} aria-labelledby="child-absences">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="child-absences" className="text-lg font-semibold">
              {t("absencesTitle", { days: PARENT_WINDOW_DAYS })}
            </h2>
            <Link
              href={`/parent/enfants/${child.id}/justifier`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-azure-700 hover:underline"
            >
              <FileCheck className="size-4" aria-hidden />
              {t("justifyNew")}
            </Link>
          </div>
          <AbsenceList
            childId={child.id}
            absences={absences.get(child.id) ?? []}
            justifications={justifications}
            emptyLabel={t("absencesEmpty", { name: child.firstName })}
          />
        </section>
        <section className={`${card} lg:col-span-2`} aria-labelledby="child-justifications">
          <h2 id="child-justifications" className="text-lg font-semibold">
            {t("justificationsTitle")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("justificationsHint")}</p>
          <JustificationList
            justifications={justifications}
            userId={user.id}
            emptyLabel={t("justificationsEmpty", { name: child.firstName })}
          />
        </section>
      </div>
    </>
  );
}

export default async function ParentChildPage({ params }: PageProps<"/[locale]/parent/enfants/[id]">) {
  const t = await getTranslations("parentSpace");
  return (
    <>
      <Link href="/parent" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <ChildDetail params={params} />
      </Suspense>
    </>
  );
}
