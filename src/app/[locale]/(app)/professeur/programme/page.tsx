import { Suspense } from "react";
import type { Metadata } from "next";
import { BookOpen, LayoutGrid } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { FilterSelect } from "@/components/data/filter-select";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { todayInDakar } from "@/features/dashboard/calendar";
import { listTeacherGradebooks } from "@/features/evaluations/queries";
import { AddChaptersSheet } from "@/features/programme/components/add-chapters-sheet";
import { ChapterBoard } from "@/features/programme/components/chapter-board";
import { ProgressSummary } from "@/features/programme/components/progress-summary";
import { getClassProgress, listChapters, listClassProgrammes, schoolYearMonths } from "@/features/programme/queries";
import { requireSpace } from "@/lib/auth/session";
import { summarizeProgress } from "@/lib/domain/programme";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("programme") };
}

type SearchParams = PageProps<"/[locale]/professeur/programme">["searchParams"];

/** Programme et progression d'une classe dans une matière (?cours=classe:matiere), rédigés et suivis par le professeur. */
async function Programme({ searchParams }: { searchParams: SearchParams }) {
  const [params, { user, entry }, t] = await Promise.all([
    searchParams,
    requireSpace("professeur"),
    getTranslations("programme"),
  ]);
  const schoolId = entry.schoolId!;
  const gradebooks = await listTeacherGradebooks(schoolId, user.id);
  const courses = gradebooks.flatMap((book) =>
    book.subjects.map((subject) => ({
      value: `${book.id}:${subject.id}`,
      label: `${book.name} · ${subject.name}`,
      classId: book.id,
      subjectId: subject.id,
    })),
  );
  if (courses.length === 0) return <EmptyState icon={LayoutGrid} title={t("noCourses")} body={t("noCoursesHint")} />;
  const course = courses.find((c) => c.value === params.cours) ?? courses[0]!;
  const programmes = await listClassProgrammes(course.classId);
  if (!programmes) return null;
  const [chapters, progress, months] = await Promise.all([
    listChapters(programmes.levelId, course.subjectId),
    getClassProgress(course.classId),
    schoolYearMonths(schoolId),
  ]);
  const summary = summarizeProgress(chapters, progress, todayInDakar());

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("teacherDescription")}
        actions={<AddChaptersSheet levelId={programmes.levelId} subjectId={course.subjectId} months={months} />}
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterSelect
          param="cours"
          label={t("course")}
          allLabel={courses[0]!.label}
          allValue={courses[0]!.value}
          value={course.value}
          options={courses.slice(1).map(({ value, label }) => ({ value, label }))}
        />
        <div className="min-w-0 flex-1 sm:max-w-md">
          <ProgressSummary summary={summary} />
        </div>
      </div>
      {chapters.length === 0 ? (
        <EmptyState icon={BookOpen} title={t("empty")} body={t("emptyHint")} />
      ) : (
        <ChapterBoard
          classId={course.classId}
          chapters={chapters}
          statuses={Object.fromEntries(progress)}
          months={months}
          canProgress
          canEdit
          canValidate={false}
        />
      )}
    </>
  );
}

export default function TeacherProgrammePage({ searchParams }: PageProps<"/[locale]/professeur/programme">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
      <Programme searchParams={searchParams} />
    </Suspense>
  );
}
