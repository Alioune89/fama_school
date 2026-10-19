import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StepHeader, StepSkeleton, nextStepHref } from "@/features/setup/components/step-header";
import { getSetupData } from "@/features/setup/queries";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { SubjectsMatrix, type MatrixCycle, type MatrixSubject } from "./subjects-matrix";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("setup.steps.subjects");
  return { title: t("title") };
}

async function SubjectsStep() {
  const { entry } = await requireSpace("direction");
  const data = await getSetupData(entry.schoolId!);

  const cycles: MatrixCycle[] = data.cycles.map((cycle) => ({
    code: cycle.code,
    label: cycle.label,
    gradingScale: cycle.grading_scale,
    levels: data.levels
      .filter((level) => level.cycle_id === cycle.id)
      .map((level) => ({ id: level.id, code: level.code, series: level.series, label: level.label })),
  }));

  const subjects: MatrixSubject[] = data.subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    nameAr: subject.name_ar ?? "",
    shortName: subject.short_name ?? "",
    group: subject.subject_group ?? "",
    track: subject.track,
    coefficients: Object.fromEntries(
      data.levelSubjects.filter((row) => row.subject_id === subject.id).map((row) => [row.level_id, Number(row.coefficient)]),
    ),
  }));

  return (
    <SubjectsMatrix
      canEdit={permissions.manageAcademics(entry.roles)}
      nextHref={nextStepHref("subjects")}
      cycles={cycles}
      subjects={subjects}
      francoArabic={data.settings.francoArabic}
    />
  );
}

export default function SubjectsStepPage() {
  return (
    <>
      <StepHeader step="subjects" />
      <Suspense fallback={<StepSkeleton />}>
        <SubjectsStep />
      </Suspense>
    </>
  );
}
