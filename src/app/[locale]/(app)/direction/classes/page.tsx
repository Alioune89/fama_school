import { Suspense } from "react";
import type { Metadata } from "next";
import { DoorOpen, LayoutGrid, Settings2, UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { StatusPill } from "@/components/dashboard/status-pill";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { listClasses, type ClassSummary } from "@/features/classes/queries";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("classes") };
}

async function HeaderActions() {
  const { entry } = await requireSpace("direction");
  if (!permissions.manageAcademics(entry.roles)) return null;
  const t = await getTranslations("classes.list");
  return (
    <Link href="/direction/parametres/classes" className={buttonVariants({ variant: "outline" })}>
      <Settings2 aria-hidden />
      {t("manage")}
    </Link>
  );
}

async function ClassCard({ item }: { item: ClassSummary }) {
  const t = await getTranslations("classes.list");
  const fill = item.capacity ? Math.min(100, Math.round((item.count / item.capacity) * 100)) : null;
  const full = item.capacity !== null && item.count >= item.capacity;
  const missing = item.subjects - item.assigned;

  return (
    <Link
      href={`/direction/classes/${item.id}`}
      className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70 transition-shadow hover:shadow-md"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <p className="text-lg font-bold text-ink">{item.name}</p>
          {missing > 0 ? (
            <StatusPill tone="warning">{t("missingTeachers", { count: missing })}</StatusPill>
          ) : item.subjects > 0 ? (
            <StatusPill tone="success">{t("allAssigned")}</StatusPill>
          ) : null}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          <span>{item.levelLabel}</span>
          {item.room && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              · <DoorOpen className="size-3.5" aria-hidden /> {item.room}
            </span>
          )}
        </p>
      </div>

      <div>
        <p className="flex items-baseline justify-between text-sm">
          <span className="tabular text-2xl font-bold text-ink">
            {item.count}
            {item.capacity && <span className="text-sm font-medium text-muted-foreground"> / {item.capacity}</span>}
          </span>
          <span className="tabular text-xs text-ink-soft">{t("genders", { girls: item.girls, boys: item.boys })}</span>
        </p>
        {fill !== null && (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-azure-50" aria-hidden>
            <div
              className={cn("h-full rounded-full", full ? "bg-warning-500" : "bg-lavender-400")}
              style={{ width: `${fill}%` }}
            />
          </div>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-sm text-ink-soft">
        <UserRound className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{item.homeroomName ?? t("noHomeroom")}</span>
      </p>
    </Link>
  );
}

async function ClassesList() {
  const { entry } = await requireSpace("direction");
  const [{ yearLabel, cycles, total }, t] = await Promise.all([listClasses(entry.schoolId!), getTranslations("classes.list")]);

  if (!yearLabel || total === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title={yearLabel ? t("empty") : t("noYear")}
        body={t("emptyHint")}
        action={
          permissions.manageAcademics(entry.roles) ? (
            <Link href={yearLabel ? "/direction/parametres/classes" : "/direction/parametres/annee"} className={buttonVariants()}>
              {t("goToSettings")}
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      <p className="mb-5 text-sm text-muted-foreground">{t("count", { count: total, year: yearLabel })}</p>
      <div className="space-y-8">
        {cycles.map((cycle) => (
          <section key={cycle.id} aria-labelledby={`cycle-${cycle.id}`}>
            <h2 id={`cycle-${cycle.id}`} className="mb-3 text-sm font-semibold tracking-wide text-ink-soft uppercase">
              {cycle.label}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cycle.classes.map((item) => (
                <ClassCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

export default async function ClassesPage() {
  const t = await getTranslations("classes.list");
  const tNav = await getTranslations("nav");
  return (
    <>
      <PageHeader
        title={tNav("classes")}
        description={t("hint")}
        actions={
          <Suspense fallback={null}>
            <HeaderActions />
          </Suspense>
        }
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <ClassesList />
      </Suspense>
    </>
  );
}
