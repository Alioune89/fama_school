import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SheetHeading } from "@/features/grades/components/sheet-heading";
import { SubjectAveragesBoard } from "@/features/grades/components/subject-averages-board";
import { getSubjectAverages } from "@/features/grades/queries";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("grades.averages");
  return { title: t("title") };
}

type SearchParams = PageProps<"/[locale]/direction/notes/moyennes">["searchParams"];

/** Moyennes et appréciations d'une classe dans une matière (?classe=&matiere=&periode=). */
async function DirectionAverages({ searchParams }: { searchParams: SearchParams }) {
  const [params, { entry }, t] = await Promise.all([searchParams, requireSpace("direction"), getTranslations("grades.averages")]);
  const [classId, subjectId, periodId] = [String(params.classe), String(params.matiere), String(params.periode)];
  const data = await getSubjectAverages(entry.schoolId!, classId, subjectId, periodId);
  if (!data) notFound();
  return (
    <>
      <SheetHeading
        backHref={`/direction/notes?classe=${classId}&periode=${periodId}`}
        title={t("title")}
        description={t("description")}
      />
      <SubjectAveragesBoard data={data} editable={permissions.manageAcademics(entry.roles)} />
    </>
  );
}

export default function DirectionAveragesPage({ searchParams }: PageProps<"/[locale]/direction/notes/moyennes">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
      <DirectionAverages searchParams={searchParams} />
    </Suspense>
  );
}
