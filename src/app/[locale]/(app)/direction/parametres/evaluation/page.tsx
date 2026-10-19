import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StepHeader, StepSkeleton, nextStepHref } from "@/features/setup/components/step-header";
import { getSetupData } from "@/features/setup/queries";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { EvaluationForm } from "./evaluation-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("setup.steps.evaluation");
  return { title: t("title") };
}

async function EvaluationStep() {
  const { entry } = await requireSpace("direction");
  const { settings } = await getSetupData(entry.schoolId!);
  return (
    <EvaluationForm
      canEdit={permissions.manageSchool(entry.roles)}
      nextHref={nextStepHref("evaluation")}
      defaults={{ mentionThresholds: settings.mentionThresholds, evaluationWeights: settings.evaluationWeights }}
    />
  );
}

export default function EvaluationStepPage() {
  return (
    <>
      <StepHeader step="evaluation" />
      <Suspense fallback={<StepSkeleton />}>
        <EvaluationStep />
      </Suspense>
    </>
  );
}
