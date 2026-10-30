import { Suspense } from "react";
import type { Metadata } from "next";
import { Building2, Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { monthlyPrice, PUBLIC_PLANS, recommendedPlan, yearlyPrice } from "@/config/plans";
import { SchoolPlanForm } from "@/features/platform/components/school-plan-form";
import { countActiveStudents, listSchools } from "@/features/platform/queries";
import { requireSpace } from "@/lib/auth/session";
import { formatInteger, formatXOF } from "@/lib/format";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("plans") };
}

/** Grille des formules, revenu attendu et formule de chaque école selon son effectif. */
async function Plans() {
  await requireSpace("plateforme");
  const [schools, t, tPricing] = await Promise.all([
    listSchools(),
    getTranslations("platform"),
    getTranslations("landing.pricing"),
  ]);
  const students = await countActiveStudents(schools.map((school) => school.id));

  const rows = schools.map((school) => {
    const headcount = students.get(school.id) ?? 0;
    const recommended = recommendedPlan(headcount);
    return {
      ...school,
      headcount,
      recommended: recommended.id,
      // Une école pilote n'a pas de formule à revoir ; une autre doit couvrir son effectif.
      mismatch: school.plan !== "pilot" && school.plan !== recommended.id,
    };
  });
  const paying = rows.filter((row) => row.status === "active" && monthlyPrice(row.plan) !== null);
  const monthly = paying.reduce((sum, row) => sum + monthlyPrice(row.plan)!, 0);
  const trial = rows.filter((row) => row.status === "trial" || row.plan === "pilot").length;
  const toReview = rows.filter((row) => row.mismatch && row.status !== "archived").length;

  const range = (index: number) => {
    const plan = PUBLIC_PLANS[index]!;
    if (plan.maxStudents === null) return tPricing("beyond");
    const previous = PUBLIC_PLANS[index - 1]?.maxStudents;
    return previous
      ? tPricing("from", { min: formatInteger(previous + 1), max: formatInteger(plan.maxStudents) })
      : tPricing("upTo", { count: formatInteger(plan.maxStudents) });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label={t("plansPage.monthlyRevenue")} value={formatXOF(monthly)} tone="azure" />
        <KpiCard label={t("plansPage.payingSchools")} value={paying.length} tone="lavender" />
        <KpiCard label={t("plansPage.trialSchools")} value={trial} tone="sun" />
        <KpiCard label={t("plansPage.toReview")} value={toReview} tone="white" />
      </div>

      <section aria-labelledby="grid">
        <h2 id="grid" className="mb-3 text-base font-semibold">
          {t("plansPage.grid")}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PUBLIC_PLANS.map((plan, index) => {
            const count = rows.filter((row) => row.plan === plan.id && row.status !== "archived").length;
            return (
              <li
                key={plan.id}
                className={cn(
                  "rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70",
                  plan.highlighted && "ring-2 ring-azure-500",
                )}
              >
                <p className="font-semibold text-ink">{t(`plans.${plan.id}`)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{range(index)}</p>
                <p className="mt-3">
                  {plan.monthly ? (
                    <>
                      <span className="tabular text-2xl font-extrabold tracking-tight">{formatXOF(plan.monthly)}</span>{" "}
                      <span className="text-sm text-muted-foreground">{tPricing("perMonth")}</span>
                    </>
                  ) : (
                    <span className="text-2xl font-extrabold tracking-tight">{tPricing("onQuote")}</span>
                  )}
                </p>
                {plan.monthly && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tPricing("yearly", { price: formatXOF(yearlyPrice(plan.monthly)) })}
                  </p>
                )}
                <p className="mt-4 text-sm font-medium text-ink-soft">{t("plansPage.schoolsOnPlan", { count })}</p>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">{t("plansPage.gridHint")}</p>
      </section>

      <section aria-labelledby="schools-plans">
        <h2 id="schools-plans" className="mb-1 text-base font-semibold">
          {t("plansPage.schools")}
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">{t("plansPage.schoolsHint")}</p>
        {rows.length === 0 ? (
          <EmptyState icon={Building2} title={t("schoolsEmpty")} />
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li
                key={row.id}
                aria-label={row.name}
                className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{row.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {[row.city, t("plansPage.students", { count: row.headcount })].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-1.5">
                    {row.plan === "pilot" ? (
                      <StatusPill tone="info">{t("plansPage.pilot", { plan: t(`plans.${row.recommended}`) })}</StatusPill>
                    ) : row.mismatch ? (
                      <StatusPill tone="warning">
                        {t("plansPage.recommended", { plan: t(`plans.${row.recommended}`) })}
                      </StatusPill>
                    ) : (
                      <StatusPill tone="success">
                        <Check className="size-3.5" aria-hidden />
                        {t("plansPage.fits")}
                      </StatusPill>
                    )}
                  </p>
                </div>
                <SchoolPlanForm schoolId={row.id} schoolName={row.name} plan={row.plan} status={row.status} />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{t("plansPage.statusHint")}</p>
      </section>
    </div>
  );
}

export default async function PlansPage() {
  const [t, tNav] = await Promise.all([getTranslations("platform"), getTranslations("nav")]);
  return (
    <>
      <PageHeader title={tNav("plans")} description={t("plansPage.hint")} />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Plans />
      </Suspense>
    </>
  );
}
