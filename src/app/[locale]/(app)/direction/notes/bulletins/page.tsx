import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarX2, ClipboardList, Download, Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ClassPicker } from "@/features/attendance/components/class-picker";
import { todayInDakar } from "@/features/dashboard/calendar";
import { GradesTabs } from "@/features/evaluations/components/grades-tabs";
import { PeriodTabs } from "@/features/evaluations/components/period-tabs";
import { listPeriods, listSchoolGradebooks, pickPeriod } from "@/features/evaluations/queries";
import { ReportCardsPanel } from "@/features/report-cards/components/report-cards-panel";
import { listClassReportCards, listClassRoster } from "@/features/report-cards/queries";
import { formatAverage } from "@/features/grades/sheet";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reportCardsAdmin");
  return { title: t("title") };
}

type SearchParams = PageProps<"/[locale]/direction/notes/bulletins">["searchParams"];

/** Bulletins d'une classe (?classe=) sur une période (?periode=) : génération, publication, impression. */
async function ReportCards({ searchParams }: { searchParams: SearchParams }) {
  const [params, { entry }] = await Promise.all([searchParams, requireSpace("direction")]);
  const schoolId = entry.schoolId!;
  const [classes, periods, t, tEval, tCards] = await Promise.all([
    listSchoolGradebooks(schoolId),
    listPeriods(schoolId),
    getTranslations("reportCardsAdmin"),
    getTranslations("evaluations"),
    getTranslations("reportCards"),
  ]);
  if (classes.length === 0)
    return <EmptyState icon={ClipboardList} title={tEval("noSchoolClasses")} body={tEval("noSchoolClassesHint")} />;
  const period = pickPeriod(periods, todayInDakar(), params.periode);
  if (!period) return <EmptyState icon={CalendarX2} title={tEval("noPeriods")} body={tEval("noPeriodsHint")} />;

  const klass = classes.find((c) => c.id === params.classe) ?? classes[0]!;
  const [cards, roster] = await Promise.all([listClassReportCards(klass.id, period.id), listClassRoster(klass.id)]);
  const byStudent = new Map(cards.map((card) => [card.studentId, card]));
  const canManage = permissions.manageAcademics(entry.roles);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ClassPicker label={tEval("class")} value={klass.id} classes={classes} />
        <PeriodTabs periods={periods} active={period.id} basePath="/direction/notes/bulletins" params={{ classe: klass.id }} />
      </div>

      {!period.locked ? (
        <p className="flex items-start gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-ink-soft">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {t("notLocked", { label: period.label })}{" "}
            <Link
              href={`/direction/notes/conseil?classe=${klass.id}&periode=${period.id}`}
              className="font-semibold text-azure-700 hover:underline"
            >
              {t("goToCouncil")}
            </Link>
          </span>
        </p>
      ) : (
        canManage && (
          <ReportCardsPanel
            key={`${klass.id}:${period.id}`}
            classId={klass.id}
            className={klass.name}
            periodId={period.id}
            classes={classes.map(({ id, name }) => ({ id, name }))}
            generated={cards.length}
            published={cards.filter((card) => card.publishedAt).length}
            rosterSize={roster.length}
          />
        )
      )}

      {cards.length > 0 && (
        <ul className="grid max-w-4xl gap-2" aria-label={t("listLabel", { className: klass.name })}>
          {roster.map((student) => {
            const card = byStudent.get(student.id);
            return (
              <li
                key={student.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-white px-4 py-3 shadow-card ring-1 ring-line/70"
              >
                <span className="min-w-0 flex-1 truncate text-ink">
                  <span className="font-semibold">{student.lastName}</span> {student.firstName}
                </span>
                {card ? (
                  <>
                    <span className="tabular text-sm text-ink-soft">
                      {card.data.general !== null && <strong className="text-ink">{formatAverage(card.data.general)}</strong>}
                      {card.data.rank && (
                        <> · {tCards(card.data.rank.exAequo ? "rankExAequo" : "rank", { rank: card.data.rank.rank })}</>
                      )}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        card.publishedAt ? "bg-success-50 text-success-700" : "bg-muted text-ink-soft",
                      )}
                    >
                      {card.publishedAt ? t("published") : t("notPublished")}
                    </span>
                    <Link
                      href={`/direction/notes/bulletins/${card.id}`}
                      className="text-sm font-semibold text-azure-700 hover:underline"
                      aria-label={t("previewFor", { name: `${student.firstName} ${student.lastName}` })}
                    >
                      {t("preview")}
                    </Link>
                    <a
                      href={`/api/bulletins/${card.id}`}
                      download
                      className="inline-flex items-center gap-1 text-sm font-semibold text-azure-700 hover:underline"
                      aria-label={t("downloadFor", { name: `${student.firstName} ${student.lastName}` })}
                    >
                      <Download className="size-4" aria-hidden />
                      PDF
                    </a>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">{t("missing")}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default async function ReportCardsPage({ searchParams }: PageProps<"/[locale]/direction/notes/bulletins">) {
  const t = await getTranslations("reportCardsAdmin");
  const tNav = await getTranslations("nav");
  return (
    <>
      <PageHeader title={tNav("grades")} description={t("description")} />
      <GradesTabs active="reportCards" />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <ReportCards searchParams={searchParams} />
      </Suspense>
    </>
  );
}
