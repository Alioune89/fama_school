import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StepHeader, StepSkeleton, nextStepHref } from "@/features/setup/components/step-header";
import { getSetupData } from "@/features/setup/queries";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { LevelsForm } from "./levels-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("setup.steps.levels");
  return { title: t("title") };
}

async function LevelsStep() {
  const { entry } = await requireSpace("direction");
  const data = await getSetupData(entry.schoolId!);
  const series = [...new Set(data.levels.map((level) => level.series).filter((serie): serie is string => Boolean(serie)))];

  return (
    <LevelsForm
      canEdit={permissions.manageAcademics(entry.roles)}
      nextHref={nextStepHref("levels")}
      defaults={{
        cycles: data.cycles.map((cycle) => cycle.code),
        series: series.length ? series.filter((serie): serie is "L" | "S" => serie === "L" || serie === "S") : ["L", "S"],
        francoArabic: data.settings.francoArabic || data.subjects.some((subject) => subject.track === "arabic"),
      }}
    />
  );
}

export default function LevelsStepPage() {
  return (
    <>
      <StepHeader step="levels" />
      <Suspense fallback={<StepSkeleton />}>
        <LevelsStep />
      </Suspense>
    </>
  );
}
