import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StepHeader, StepSkeleton, nextStepHref } from "@/features/setup/components/step-header";
import { getSetupData } from "@/features/setup/queries";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import {
  DEFAULT_LYCEE_SERIES,
  LEGACY_UPPER_SERIES,
  SECONDE_SERIES,
  UPPER_SERIES,
  type SecondeSerie,
  type UpperSerie,
} from "@/lib/domain/senegal-presets";
import { LevelsForm } from "./levels-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("setup.steps.levels");
  return { title: t("title") };
}

async function LevelsStep() {
  const { entry } = await requireSpace("direction");
  const data = await getSetupData(entry.schoolId!);
  const seriesOf = (codes: string[]) => [
    ...new Set(data.levels.filter((level) => level.series && codes.includes(level.code)).map((level) => level.series!)),
  ];
  const seconde = seriesOf(["2nde"]).filter((serie): serie is SecondeSerie =>
    (SECONDE_SERIES as readonly string[]).includes(serie),
  );
  const upper = seriesOf(["1ère", "Tle"]).filter((serie): serie is UpperSerie =>
    [...UPPER_SERIES, ...LEGACY_UPPER_SERIES].some((known) => known === serie),
  );

  return (
    <LevelsForm
      canEdit={permissions.manageAcademics(entry.roles)}
      nextHref={nextStepHref("levels")}
      defaults={{
        cycles: data.cycles.map((cycle) => cycle.code),
        series:
          seconde.length + upper.length > 0
            ? { seconde, upper }
            : { seconde: [...DEFAULT_LYCEE_SERIES.seconde], upper: [...DEFAULT_LYCEE_SERIES.upper] },
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
