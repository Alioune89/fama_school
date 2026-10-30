import { Suspense } from "react";
import type { Metadata } from "next";
import { Building2, ChevronRight, Inbox, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { StatusPill, type StatusTone } from "@/components/dashboard/status-pill";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { countNewDemoRequests, listSchools } from "@/features/platform/queries";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";
import { formatInteger } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("platform");
  return { title: t("schoolsTitle") };
}

const STATUS_TONE: Record<Enums<"school_status">, StatusTone> = {
  trial: "info",
  active: "success",
  suspended: "danger",
  archived: "neutral",
};

async function SchoolsTable() {
  await requireSpace("plateforme");
  const [schools, t] = await Promise.all([listSchools(), getTranslations("platform")]);

  if (schools.length === 0) return <EmptyState icon={Building2} title={t("schoolsEmpty")} />;

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-card ring-1 ring-line/70">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-azure-50 text-xs font-semibold text-ink-soft">
            <tr>
              <th scope="col" className="px-5 py-4">{t("columns.name")}</th>
              <th scope="col" className="px-5 py-4">{t("columns.city")}</th>
              <th scope="col" className="px-5 py-4">{t("columns.plan")}</th>
              <th scope="col" className="px-5 py-4">{t("columns.status")}</th>
              <th scope="col" className="px-5 py-4 text-right">{t("columns.members")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {schools.map((school) => (
              <tr key={school.id} className="transition-colors hover:bg-azure-50/50">
                <td className="px-5 py-4">
                  <span className="block font-semibold text-ink">{school.name}</span>
                  <span className="block text-xs text-muted-foreground">{school.slug}</span>
                </td>
                <td className="px-5 py-4 text-ink-soft">{school.city ?? "—"}</td>
                <td className="px-5 py-4 text-ink-soft">{t(`plans.${school.plan}`)}</td>
                <td className="px-5 py-4">
                  <StatusPill tone={STATUS_TONE[school.status]}>{t(`statuses.${school.status}`)}</StatusPill>
                </td>
                <td className="tabular px-5 py-4 text-right font-semibold text-ink">{formatInteger(school.members)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Écoles qui attendent d'être rappelées : le premier geste de la journée pour l'équipe. */
async function NewDemoRequests() {
  await requireSpace("plateforme");
  const [count, t] = await Promise.all([countNewDemoRequests(), getTranslations("platform.demoRequests")]);
  if (count === 0) return null;
  return (
    <Link
      href="/plateforme/demandes"
      className="mb-6 flex items-center gap-3 rounded-xl bg-sun-50 px-4 py-3 ring-1 ring-sun-200 transition-colors hover:bg-sun-100"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-sun-200">
        <Inbox className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 font-medium text-ink">{t("toCall", { count })}</span>
      <ChevronRight className="size-5 shrink-0 text-ink-soft" aria-hidden />
    </Link>
  );
}

export default async function PlatformSchoolsPage() {
  const t = await getTranslations("platform");
  return (
    <>
      <PageHeader
        title={t("schoolsTitle")}
        actions={
          <Link href="/plateforme/ecoles/nouvelle" className={buttonVariants()}>
            <Plus aria-hidden />
            {t("newSchool")}
          </Link>
        }
      />
      <Suspense fallback={null}>
        <NewDemoRequests />
      </Suspense>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <SchoolsTable />
      </Suspense>
    </>
  );
}
