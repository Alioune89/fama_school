import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StepHeader, StepSkeleton, nextStepHref } from "@/features/setup/components/step-header";
import { getSetupData } from "@/features/setup/queries";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { buildPeriods, defaultAcademicYear } from "@/lib/domain/academic-calendar";
import { AcademicYearForm } from "./academic-year-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("setup.steps.year");
  return { title: t("title") };
}

async function YearStep() {
  const { entry } = await requireSpace("direction");
  const { year } = await getSetupData(entry.schoolId!);

  const draft = year
    ? { label: year.label, startsOn: year.starts_on, endsOn: year.ends_on }
    : defaultAcademicYear(new Date());
  const periodKind = year?.period_kind ?? "semester";
  const periods = year?.periods.length
    ? year.periods.map((period) => ({ position: period.position, label: period.label, startsOn: period.starts_on, endsOn: period.ends_on }))
    : buildPeriods(draft, periodKind);

  return (
    <AcademicYearForm
      canEdit={permissions.manageAcademics(entry.roles)}
      nextHref={nextStepHref("year")}
      locked={Boolean(year?.periods.some((period) => period.locked_at))}
      defaults={{ ...draft, periodKind, periods }}
    />
  );
}

export default function YearStepPage() {
  return (
    <>
      <StepHeader step="year" />
      <Suspense fallback={<StepSkeleton />}>
        <YearStep />
      </Suspense>
    </>
  );
}
