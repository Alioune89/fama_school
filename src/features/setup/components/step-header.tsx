import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SETUP_STEPS, stepIndex, type SetupStepKey } from "../steps";

export async function StepHeader({ step }: { step: SetupStepKey }) {
  const t = await getTranslations("setup");
  return (
    <div className="mb-6">
      <Link href="/direction/parametres" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToOverview")}
      </Link>
      <p className="mt-4 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {t("stepOf", { index: stepIndex(step) + 1, total: SETUP_STEPS.length })}
      </p>
      <h1 className="mt-1 text-2xl font-bold sm:text-[28px]">{t(`steps.${step}.title`)}</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t(`steps.${step}.description`)}</p>
    </div>
  );
}

export function StepSkeleton() {
  return (
    <div className="space-y-4 rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70" aria-hidden>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-11 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

/** Lien vers l'étape suivante (ou la vue d'ensemble après la dernière). */
export function nextStepHref(step: SetupStepKey): string {
  return SETUP_STEPS[stepIndex(step) + 1]?.href ?? "/direction/parametres";
}
