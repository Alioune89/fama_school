import { Suspense } from "react";
import type { Metadata } from "next";
import { BadgeCheck, BookOpen, ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { FilterSelect } from "@/components/data/filter-select";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { todayInDakar } from "@/features/dashboard/calendar";
import { listSchoolGradebooks } from "@/features/evaluations/queries";
import { AddChaptersSheet } from "@/features/programme/components/add-chapters-sheet";
import { ChapterBoard } from "@/features/programme/components/chapter-board";
import { ProgressSummary } from "@/features/programme/components/progress-summary";
import {
  getClassProgress,
  listChapters,
  listClassProgrammes,
  listPendingValidations,
  schoolYearMonths,
} from "@/features/programme/queries";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { summarizeProgress } from "@/lib/domain/programme";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("programme") };
}

type SearchParams = PageProps<"/[locale]/direction/programme">["searchParams"];
const card = "rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70";

/**
 * Progression des classes : chapitres à valider, avancement de chaque matière d'une classe (?classe=),
 * détail d'une matière (?matiere=) avec validation et rédaction du programme.
 */
async function Programme({ searchParams }: { searchParams: SearchParams }) {
  const [params, { entry }, t] = await Promise.all([searchParams, requireSpace("direction"), getTranslations("programme")]);
  const schoolId = entry.schoolId!;
  const academics = permissions.manageAcademics(entry.roles);
  const classes = await listSchoolGradebooks(schoolId);
  if (classes.length === 0) return <EmptyState icon={LayoutGrid} title={t("noClasses")} body={t("noClassesHint")} />;
  const klass = classes.find((c) => c.id === params.classe) ?? classes[0]!;
  const subject = klass.subjects.find((s) => s.id === params.matiere) ?? null;
  const today = todayInDakar();
  const [programmes, progress, pending, months] = await Promise.all([
    listClassProgrammes(klass.id),
    getClassProgress(klass.id),
    academics ? listPendingValidations(schoolId) : [],
    schoolYearMonths(schoolId),
  ]);

  const classFilter = (
    <FilterSelect
      param="classe"
      label={t("class")}
      allLabel={classes[0]!.name}
      allValue={classes[0]!.id}
      value={klass.id}
      options={classes.slice(1).map((c) => ({ value: c.id, label: c.name }))}
    />
  );

  if (subject && programmes) {
    const chapters = await listChapters(programmes.levelId, subject.id);
    return (
      <>
        <Link
          href={`/direction/programme?classe=${klass.id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {t("backToClass", { className: klass.name })}
        </Link>
        <PageHeader
          title={t("subjectTitle", { subject: subject.name, className: klass.name })}
          actions={academics && <AddChaptersSheet levelId={programmes.levelId} subjectId={subject.id} months={months} />}
        />
        <div className="mb-5 max-w-md">
          <ProgressSummary summary={summarizeProgress(chapters, progress, today)} />
        </div>
        {chapters.length === 0 ? (
          <EmptyState icon={BookOpen} title={t("empty")} body={t("emptyHintDirection")} />
        ) : (
          <ChapterBoard
            classId={klass.id}
            chapters={chapters}
            statuses={Object.fromEntries(progress)}
            months={months}
            canProgress={academics}
            canEdit={academics}
            canValidate={academics}
          />
        )}
      </>
    );
  }

  const bySubject = new Map((programmes?.programmes ?? []).map((p) => [p.subjectId, p]));
  return (
    <>
      <PageHeader title={t("title")} description={t("directionDescription")} actions={classFilter} />
      {pending.length > 0 && (
        <section aria-labelledby="pending" className={`${card} mb-6`}>
          <h2 id="pending" className="flex items-center gap-2 text-base font-semibold">
            <BadgeCheck className="size-4 text-azure-700" aria-hidden />
            {t("pendingTitle", { count: pending.length })}
          </h2>
          <ul className="mt-2 divide-y divide-line">
            {pending.slice(0, 8).map((item) => (
              <li key={`${item.classId}:${item.chapterId}`}>
                <Link
                  href={`/direction/programme?classe=${item.classId}&matiere=${classes.find((c) => c.id === item.classId)?.subjects.find((s) => s.name === item.subjectName)?.id ?? ""}`}
                  className="flex items-center gap-3 py-2.5 text-sm hover:text-azure-700"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{item.chapterTitle}</span>
                    <span className="block text-xs text-muted-foreground">
                      {item.className} · {item.subjectName}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-ink-soft" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label={t("subjectsLabel", { className: klass.name })}>
        {klass.subjects.map((s) => {
          const programme = bySubject.get(s.id);
          return (
            <li key={s.id}>
              <Link
                href={`/direction/programme?classe=${klass.id}&matiere=${s.id}`}
                className={`${card} block hover:ring-azure-300`}
              >
                <span className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{s.name}</span>
                  <ChevronRight className="size-4 text-ink-soft" aria-hidden />
                </span>
                {programme ? (
                  <ProgressSummary summary={summarizeProgress(programme.chapters, progress, today)} compact />
                ) : (
                  <span className="text-xs text-muted-foreground">{t("noProgramme")}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function DirectionProgrammePage({ searchParams }: PageProps<"/[locale]/direction/programme">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
      <Programme searchParams={searchParams} />
    </Suspense>
  );
}
