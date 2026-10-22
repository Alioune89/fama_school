import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { AttendanceTabs } from "@/features/attendance/components/attendance-tabs";
import { ReviewList } from "@/features/justifications/components/review-list";
import { countPendingJustifications, listJustificationsForReview, type ReviewFilter } from "@/features/justifications/queries";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("attendance") };
}

type SearchParams = PageProps<"/[locale]/direction/presences/justificatifs">["searchParams"];

/** « À traiter » (par défaut) ou « Traités » (?vue=traites). */
async function Justifications({ searchParams }: { searchParams: SearchParams }) {
  const [params, { entry }] = await Promise.all([searchParams, requireSpace("direction")]);
  const filter: ReviewFilter = params.vue === "traites" ? "reviewed" : "pending";
  const schoolId = entry.schoolId!;
  const [items, pendingCount, t] = await Promise.all([
    listJustificationsForReview(schoolId, filter),
    countPendingJustifications(schoolId),
    getTranslations("justifications.review"),
  ]);
  const views = [
    { key: "pending", href: "/direction/presences/justificatifs", label: t("pending"), count: pendingCount },
    { key: "reviewed", href: "/direction/presences/justificatifs?vue=traites", label: t("reviewed"), count: null },
  ] as const;

  return (
    <>
      <nav aria-label={t("filterLabel")} className="mb-4 flex gap-2">
        {views.map((view) => (
          <Link
            key={view.key}
            href={view.href}
            aria-current={filter === view.key ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition-colors",
              filter === view.key ? "bg-ink text-white ring-ink" : "bg-white text-ink-soft ring-line hover:text-ink",
            )}
          >
            {view.label}
            {view.count ? (
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  filter === view.key ? "bg-white/20" : "bg-azure-100 text-ink",
                )}
              >
                {view.count}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>
      <ReviewList items={items} filter={filter} canReview={permissions.reviewAbsences(entry.roles)} />
    </>
  );
}

export default async function AttendanceJustificationsPage({
  searchParams,
}: PageProps<"/[locale]/direction/presences/justificatifs">) {
  const t = await getTranslations("justifications.review");
  const tNav = await getTranslations("nav");
  return (
    <>
      <PageHeader title={tNav("attendance")} description={t("hint")} />
      <AttendanceTabs active="justifications" />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Justifications searchParams={searchParams} />
      </Suspense>
    </>
  );
}
