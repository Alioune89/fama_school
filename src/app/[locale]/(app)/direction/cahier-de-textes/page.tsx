import { Suspense } from "react";
import type { Metadata } from "next";
import { LayoutGrid } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { FilterSelect } from "@/components/data/filter-select";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { listSchoolGradebooks } from "@/features/evaluations/queries";
import { LessonList } from "@/features/lesson-book/components/lesson-list";
import { listLessons } from "@/features/lesson-book/queries";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("homework") };
}

type SearchParams = PageProps<"/[locale]/direction/cahier-de-textes">["searchParams"];

/** Cahier de textes d'une classe (?classe=, ?matiere=) : séances et devoirs de toutes les matières. */
async function LessonBook({ searchParams }: { searchParams: SearchParams }) {
  const [params, { entry }, t] = await Promise.all([searchParams, requireSpace("direction"), getTranslations("lessonBook")]);
  const classes = await listSchoolGradebooks(entry.schoolId!);
  if (classes.length === 0) return <EmptyState icon={LayoutGrid} title={t("noClasses")} body={t("noClassesHint")} />;
  const klass = classes.find((c) => c.id === params.classe) ?? classes[0]!;
  const subject = klass.subjects.find((s) => s.id === params.matiere);
  const lessons = await listLessons(klass.id, subject?.id, 100);
  return (
    <>
      <PageHeader title={t("title")} description={t("directionDescription")} />
      <div className="mb-5 grid gap-3 sm:flex">
        <FilterSelect
          param="classe"
          label={t("class")}
          allLabel={classes[0]!.name}
          allValue={classes[0]!.id}
          value={klass.id}
          options={classes.slice(1).map((c) => ({ value: c.id, label: c.name }))}
        />
        <FilterSelect
          param="matiere"
          label={t("subject")}
          allLabel={t("allSubjects")}
          options={klass.subjects.map((s) => ({ value: s.id, label: s.name }))}
        />
      </div>
      <LessonList lessons={lessons} showSubject />
    </>
  );
}

export default function DirectionLessonBookPage({ searchParams }: PageProps<"/[locale]/direction/cahier-de-textes">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
      <LessonBook searchParams={searchParams} />
    </Suspense>
  );
}
