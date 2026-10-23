import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { listTeacherGradebooks } from "@/features/evaluations/queries";
import { GradeSheet } from "@/features/grades/components/grade-sheet";
import { GradeSheetFallback } from "@/features/grades/components/grade-sheet-fallback";
import { SheetHeading } from "@/features/grades/components/sheet-heading";
import { getGradeSheet } from "@/features/grades/queries";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("grades");
  return { title: t("title") };
}

type Params = PageProps<"/[locale]/professeur/notes/[evaluationId]">["params"];

/** Feuille de notes : modifiable par l'enseignant de la matière (ou le titulaire), lisible par les autres enseignants de la classe. */
async function TeacherGradeSheet({ params }: { params: Params }) {
  const [{ evaluationId }, { user, entry }] = await Promise.all([params, requireSpace("professeur")]);
  const schoolId = entry.schoolId!;
  const [data, gradebooks] = await Promise.all([getGradeSheet(schoolId, evaluationId), listTeacherGradebooks(schoolId, user.id)]);
  if (!data) notFound();
  const editable = gradebooks.some((c) => c.id === data.classId && c.subjects.some((s) => s.id === data.subjectId));
  return (
    <>
      <SheetHeading backHref={`/professeur/notes?classe=${data.classId}&periode=${data.periodId}`} />
      <GradeSheet userId={user.id} data={data} editable={editable} />
    </>
  );
}

export default function TeacherGradeSheetPage({ params }: PageProps<"/[locale]/professeur/notes/[evaluationId]">) {
  return (
    <Suspense fallback={<GradeSheetFallback backHref="/professeur/notes" />}>
      <TeacherGradeSheet params={params} />
    </Suspense>
  );
}
