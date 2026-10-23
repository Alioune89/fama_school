import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { listTeacherGradebooks } from "@/features/evaluations/queries";
import { SheetHeading } from "@/features/grades/components/sheet-heading";
import { SubjectAveragesBoard } from "@/features/grades/components/subject-averages-board";
import { getSubjectAverages } from "@/features/grades/queries";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("grades.averages");
  return { title: t("title") };
}

type SearchParams = PageProps<"/[locale]/professeur/notes/moyennes">["searchParams"];

/** Moyennes et appréciations d'une matière que l'enseignant note (?classe=&matiere=&periode=). */
async function TeacherAverages({ searchParams }: { searchParams: SearchParams }) {
  const [params, { user, entry }, t] = await Promise.all([
    searchParams,
    requireSpace("professeur"),
    getTranslations("grades.averages"),
  ]);
  const schoolId = entry.schoolId!;
  const [classId, subjectId, periodId] = [String(params.classe), String(params.matiere), String(params.periode)];
  const gradebooks = await listTeacherGradebooks(schoolId, user.id);
  if (!gradebooks.some((c) => c.id === classId && c.subjects.some((s) => s.id === subjectId))) notFound();
  const data = await getSubjectAverages(schoolId, classId, subjectId, periodId);
  if (!data) notFound();
  return (
    <>
      <SheetHeading
        backHref={`/professeur/notes?classe=${classId}&periode=${periodId}`}
        title={t("title")}
        description={t("description")}
      />
      <SubjectAveragesBoard data={data} editable />
    </>
  );
}

export default function TeacherAveragesPage({ searchParams }: PageProps<"/[locale]/professeur/notes/moyennes">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
      <TeacherAverages searchParams={searchParams} />
    </Suspense>
  );
}
