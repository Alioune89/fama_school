import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PersonAvatar } from "@/components/people/person-avatar";
import { todayInDakar } from "@/features/dashboard/calendar";
import { AbsenceList } from "@/features/parent/components/absence-list";
import { listChildrenAbsences, listMyChildren, PARENT_WINDOW_DAYS, parentWindowStart } from "@/features/parent/queries";
import { ReportList } from "@/features/reports/components/report-list";
import { listStudentReports } from "@/features/reports/queries";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("children") };
}

const card = "rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6";

/** Fiche d'un enfant pour son parent : signalements des enseignants, absences et retards. */
async function ChildDetail({ params }: { params: PageProps<"/[locale]/parent/enfants/[id]">["params"] }) {
  const [{ id }, { user }] = await Promise.all([params, requireSpace("parent")]);
  const child = (await listMyChildren(user.id)).find((c) => c.id === id);
  if (!child) notFound();

  const today = todayInDakar();
  const [reports, absences, t] = await Promise.all([
    listStudentReports(child.id),
    listChildrenAbsences([child.id], parentWindowStart(today)),
    getTranslations("parentSpace"),
  ]);
  const name = `${child.firstName} ${child.lastName}`;

  return (
    <>
      <section className="mb-6 flex items-center gap-4">
        <PersonAvatar name={name} size="lg" />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="text-sm text-muted-foreground">{[child.className, child.schoolName].filter(Boolean).join(" · ")}</p>
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card} aria-labelledby="child-reports">
          <h2 id="child-reports" className="text-lg font-semibold">
            {t("reportsTitle")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("reportsHint")}</p>
          <ReportList reports={reports} emptyLabel={t("reportsEmpty", { name: child.firstName })} />
        </section>
        <section className={card} aria-labelledby="child-absences">
          <h2 id="child-absences" className="text-lg font-semibold">
            {t("absencesTitle", { days: PARENT_WINDOW_DAYS })}
          </h2>
          <AbsenceList absences={absences.get(child.id) ?? []} emptyLabel={t("absencesEmpty", { name: child.firstName })} />
        </section>
      </div>
    </>
  );
}

export default async function ParentChildPage({ params }: PageProps<"/[locale]/parent/enfants/[id]">) {
  const t = await getTranslations("parentSpace");
  return (
    <>
      <Link href="/parent" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <ChildDetail params={params} />
      </Suspense>
    </>
  );
}
