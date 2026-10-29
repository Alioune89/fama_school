import { Suspense } from "react";
import type { Metadata } from "next";
import { LayoutGrid } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { FilterSelect } from "@/components/data/filter-select";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { todayInDakar } from "@/features/dashboard/calendar";
import { listTeacherGradebooks } from "@/features/evaluations/queries";
import { LessonForm } from "@/features/lesson-book/components/lesson-form";
import { LessonList } from "@/features/lesson-book/components/lesson-list";
import { listLessons } from "@/features/lesson-book/queries";
import { listChapters, listClassProgrammes } from "@/features/programme/queries";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("homework") };
}

type SearchParams = PageProps<"/[locale]/professeur/cahier-de-textes">["searchParams"];

/** Cahier de textes d'une classe dans une matière (?cours=classe:matiere) : nouvelle séance et séances passées. */
async function LessonBook({ searchParams }: { searchParams: SearchParams }) {
  const [params, { user, entry }, t] = await Promise.all([
    searchParams,
    requireSpace("professeur"),
    getTranslations("lessonBook"),
  ]);
  const gradebooks = await listTeacherGradebooks(entry.schoolId!, user.id);
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
  const [lessons, chapters] = await Promise.all([
    listLessons(course.classId, course.subjectId),
    programmes ? listChapters(programmes.levelId, course.subjectId) : [],
  ]);
  return (
    <>
      <PageHeader title={t("title")} description={t("teacherDescription")} />
      <div className="mb-5">
        <FilterSelect
          param="cours"
          label={t("course")}
          allLabel={courses[0]!.label}
          allValue={courses[0]!.value}
          value={course.value}
          options={courses.slice(1).map(({ value, label }) => ({ value, label }))}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <LessonForm
          key={course.value}
          classId={course.classId}
          subjectId={course.subjectId}
          today={todayInDakar()}
          chapters={chapters.map(({ id, title }) => ({ id, title }))}
        />
        <section aria-labelledby="past-lessons">
          <h2 id="past-lessons" className="mb-3 text-base font-semibold">
            {t("pastTitle")}
          </h2>
          <LessonList lessons={lessons} canDelete />
        </section>
      </div>
    </>
  );
}

export default function TeacherLessonBookPage({ searchParams }: PageProps<"/[locale]/professeur/cahier-de-textes">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
      <LessonBook searchParams={searchParams} />
    </Suspense>
  );
}
