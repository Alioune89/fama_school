import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { GradeSheet } from "@/features/grades/components/grade-sheet";
import { GradeSheetFallback } from "@/features/grades/components/grade-sheet-fallback";
import { SheetHeading } from "@/features/grades/components/sheet-heading";
import { getGradeSheet } from "@/features/grades/queries";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("grades");
  return { title: t("title") };
}

type Params = PageProps<"/[locale]/direction/notes/[evaluationId]">["params"];

/** Feuille de notes vue par la direction : la direction pédagogique la corrige, les autres rôles la consultent. */
async function DirectionGradeSheet({ params }: { params: Params }) {
  const [{ evaluationId }, { user, entry }] = await Promise.all([params, requireSpace("direction")]);
  const data = await getGradeSheet(entry.schoolId!, evaluationId);
  if (!data) notFound();
  return (
    <>
      <SheetHeading backHref={`/direction/notes?classe=${data.classId}&periode=${data.periodId}`} />
      <GradeSheet userId={user.id} data={data} editable={permissions.manageAcademics(entry.roles)} />
    </>
  );
}

export default function DirectionGradeSheetPage({ params }: PageProps<"/[locale]/direction/notes/[evaluationId]">) {
  return (
    <Suspense fallback={<GradeSheetFallback backHref="/direction/notes" />}>
      <DirectionGradeSheet params={params} />
    </Suspense>
  );
}
