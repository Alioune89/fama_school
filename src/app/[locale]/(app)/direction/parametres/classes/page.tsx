import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StepHeader, StepSkeleton, nextStepHref } from "@/features/setup/components/step-header";
import { getSetupData } from "@/features/setup/queries";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { ClassesGenerator } from "./classes-generator";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("setup.steps.classes");
  return { title: t("title") };
}

async function ClassesStep() {
  const { entry } = await requireSpace("direction");
  const data = await getSetupData(entry.schoolId!);
  const cycleLabel = new Map(data.cycles.map((cycle) => [cycle.id, cycle.label]));

  return (
    <ClassesGenerator
      canEdit={permissions.manageAcademics(entry.roles)}
      nextHref={nextStepHref("classes")}
      hasYear={Boolean(data.year)}
      yearLabel={data.year?.label ?? null}
      levels={data.levels.map((level) => ({
        id: level.id,
        code: level.code,
        label: level.label,
        series: level.series,
        cycleLabel: cycleLabel.get(level.cycle_id) ?? "",
        existing: data.classes.filter((item) => item.level_id === level.id).map((item) => item.name),
      }))}
    />
  );
}

export default function ClassesStepPage() {
  return (
    <>
      <StepHeader step="classes" />
      <Suspense fallback={<StepSkeleton />}>
        <ClassesStep />
      </Suspense>
    </>
  );
}
