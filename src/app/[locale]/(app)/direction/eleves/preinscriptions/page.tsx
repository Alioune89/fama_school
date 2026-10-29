import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowLeft, ChevronRight, ClipboardPen, Paperclip } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { StatusPill } from "@/components/dashboard/status-pill";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PersonAvatar } from "@/components/people/person-avatar";
import { STATUS_TONES } from "@/features/preregistrations/components/status-tones";
import { listPreregistrations } from "@/features/preregistrations/queries";
import { PREREGISTRATION_STATUSES, type PreregistrationStatus } from "@/features/preregistrations/schemas";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

type SearchParams = PageProps<"/[locale]/direction/eleves/preinscriptions">["searchParams"];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("preregistrations");
  return { title: t("title") };
}

/** Filtre « statut » : en attente par défaut, « tout » pour toutes les demandes. */
function readStatus(value: unknown): PreregistrationStatus | null {
  if (value === "tout") return null;
  return (PREREGISTRATION_STATUSES as readonly unknown[]).includes(value) ? (value as PreregistrationStatus) : "pending";
}

async function Requests({ searchParams }: { searchParams: SearchParams }) {
  const { entry } = await requireSpace("direction");
  const t = await getTranslations("preregistrations");
  if (!permissions.managePeople(entry.roles)) {
    return <EmptyState icon={ClipboardPen} title={t("forbidden")} />;
  }
  const status = readStatus((await searchParams).statut);
  const { rows, counts } = await listPreregistrations(entry.schoolId!, status);
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const filters: { value: string; label: string; count: number; active: boolean }[] = [
    ...PREREGISTRATION_STATUSES.map((value) => ({
      value,
      label: t(`statuses.${value}`),
      count: counts[value] ?? 0,
      active: status === value,
    })),
    { value: "tout", label: t("all"), count: total, active: status === null },
  ];

  return (
    <>
      <nav aria-label={t("filterLabel")} className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => (
          <Link
            key={filter.value}
            href={`/direction/eleves/preinscriptions?statut=${filter.value}`}
            aria-current={filter.active ? "page" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 ring-line",
              filter.active ? "bg-ink text-white ring-ink" : "bg-white text-ink-soft hover:text-ink",
            )}
          >
            {filter.label}
            <span className="tabular-nums opacity-70">{filter.count}</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState icon={ClipboardPen} title={t("empty")} body={total === 0 ? t("emptyHint") : undefined} />
      ) : (
        <ul className="grid gap-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/direction/eleves/preinscriptions/${row.id}`}
                className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70 hover:bg-azure-50/60"
              >
                <PersonAvatar name={row.childName} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold text-ink">{row.childName}</span>
                    <StatusPill tone={STATUS_TONES[row.status]}>{t(`statuses.${row.status}`)}</StatusPill>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {[row.levelLabel, `${row.guardianName} · ${formatPhone(row.guardianPhone)}`].filter(Boolean).join(" · ")}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                    <span className="tabular-nums">{row.reference}</span>
                    <span>{t("receivedOn", { date: formatDate(row.createdAt) })}</span>
                    {row.attachmentCount > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Paperclip className="size-3.5" aria-hidden />
                        {t("attachmentCount", { count: row.attachmentCount })}
                      </span>
                    )}
                  </span>
                </span>
                <ChevronRight className="mt-1 size-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default async function PreregistrationsPage({ searchParams }: PageProps<"/[locale]/direction/eleves/preinscriptions">) {
  const [t, tNav] = await Promise.all([getTranslations("preregistrations"), getTranslations("nav")]);
  return (
    <>
      <Link href="/direction/eleves" className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        {tNav("students")}
      </Link>
      <PageHeader title={t("title")} description={t("hint")} />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Requests searchParams={searchParams} />
      </Suspense>
    </>
  );
}
