import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarRange, Check, GraduationCap, LayoutGrid, Medal, School, Shapes } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getSetupData, type SetupData } from "@/features/setup/queries";
import { SETUP_STEPS, type SetupStepKey } from "@/features/setup/steps";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("setup");
  return { title: t("title") };
}

const ICONS: Record<SetupStepKey, typeof School> = {
  school: School,
  year: CalendarRange,
  levels: Shapes,
  subjects: GraduationCap,
  classes: LayoutGrid,
  evaluation: Medal,
};

async function summaryFor(step: SetupStepKey, data: SetupData): Promise<string | null> {
  const t = await getTranslations("setup.summary");
  switch (step) {
    case "school":
      return data.school.city ? `${data.school.name} · ${data.school.city}` : null;
    case "year":
      return data.year ? t("year", { label: data.year.label, count: data.year.periods.length }) : null;
    case "levels":
      return data.levels.length ? t("levels", { count: data.levels.length }) : null;
    case "subjects":
      return data.subjects.length ? t("subjects", { count: data.subjects.length }) : null;
    case "classes":
      return data.classes.length ? t("classes", { count: data.classes.length }) : null;
    case "evaluation":
      return data.status.evaluation ? t("evaluation", { felicitations: data.settings.mentionThresholds.twenty.felicitations }) : null;
  }
}

async function SetupOverview() {
  const { entry } = await requireSpace("direction");
  const data = await getSetupData(entry.schoolId!);
  const t = await getTranslations("setup");
  const summaries = await Promise.all(SETUP_STEPS.map((step) => summaryFor(step.key, data)));

  return (
    <>
      <div className="mb-6 rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-semibold text-ink">{t("progress", { completed: data.status.completed, total: data.status.total })}</span>
          <span className="tabular font-semibold text-azure-700">{Math.round((data.status.completed / data.status.total) * 100)} %</span>
        </div>
        <Progress value={(data.status.completed / data.status.total) * 100} className="mt-3" aria-label={t("progress", { completed: data.status.completed, total: data.status.total })} />
        {data.status.nextStep === null && <p className="mt-3 text-sm text-success-700">{t("allDone")}</p>}
      </div>

      <ol className="grid gap-4 md:grid-cols-2">
        {SETUP_STEPS.map((step, index) => {
          const done = data.status[step.key];
          const Icon = ICONS[step.key];
          const isNext = data.status.nextStep === step.key;
          return (
            <li
              key={step.key}
              className={cn(
                "flex flex-col rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70",
                isNext && "ring-2 ring-azure-400",
              )}
            >
              <div className="flex items-start gap-4">
                <span
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-xl",
                    done ? "bg-success-50 text-success-700" : "bg-lavender-100 text-lavender-700",
                  )}
                >
                  {done ? <Check className="size-6" aria-hidden /> : <Icon className="size-6" aria-hidden strokeWidth={1.75} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-muted-foreground">{t("stepOf", { index: index + 1, total: SETUP_STEPS.length })}</p>
                  <h2 className="text-base font-semibold">{t(`steps.${step.key}.title`)}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{summaries[index] ?? t(`steps.${step.key}.description`)}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                    done ? "bg-success-50 text-success-700" : "bg-warning-50 text-warning-700",
                  )}
                >
                  {done ? t("done") : t("todo")}
                </span>
              </div>
              <div className="mt-4 flex justify-end">
                <Link href={step.href} className={buttonVariants({ variant: isNext ? "default" : "outline", size: "sm" })}>
                  {done ? t("edit") : t("configure")}
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}

export default async function SetupPage() {
  const t = await getTranslations("setup");
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <SetupOverview />
      </Suspense>
    </>
  );
}
