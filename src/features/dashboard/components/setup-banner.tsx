import { Rocket } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { SETUP_STEPS } from "@/features/setup/steps";
import type { SetupStatus } from "@/features/setup/steps";
import { Link } from "@/i18n/navigation";

/** Rappel de la mise en route, affiché tant qu'une étape reste à faire. */
export async function SetupBanner({ status }: { status: SetupStatus }) {
  if (!status.nextStep) return null;
  const t = await getTranslations("dashboard");
  const href = SETUP_STEPS.find((step) => step.key === status.nextStep)!.href;
  const progress = Math.round((status.completed / status.total) * 100);

  return (
    <section className="relative mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-azure-200 via-azure-100 to-lavender-100 p-6 shadow-card sm:flex sm:items-center sm:gap-6">
      <div aria-hidden className="absolute -top-10 -right-10 size-40 rounded-full bg-white/40" />
      <span className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-white text-azure-700">
        <Rocket className="size-6" aria-hidden strokeWidth={1.75} />
      </span>
      <div className="relative mt-4 min-w-0 flex-1 sm:mt-0">
        <h2 className="text-lg font-bold">{t("setupTitle")}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t("setupBody")}</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 w-40 overflow-hidden rounded-full bg-white/70" aria-hidden>
            <div className="h-full rounded-full bg-azure-600" style={{ width: `${progress}%` }} />
          </div>
          <span className="tabular text-xs font-semibold text-ink-soft">
            {t("setupProgress", { done: status.completed, total: status.total })}
          </span>
        </div>
      </div>
      <Link href={href} className={`${buttonVariants()} relative mt-4 sm:mt-0`}>
        {status.completed === 0 ? t("setupAction") : t("setupContinue")}
      </Link>
    </section>
  );
}
