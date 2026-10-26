import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarX2, ChevronRight, ReceiptText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { FilterSelect } from "@/components/data/filter-select";
import { SearchInput } from "@/components/data/search-input";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { todayInDakar } from "@/features/dashboard/calendar";
import { getFeeSchedule } from "@/features/fees/queries";
import { InvoiceStatusPill } from "@/features/invoices/components/invoice-status";
import { IssueInvoicesSheet } from "@/features/invoices/components/issue-invoices-sheet";
import { listInvoices } from "@/features/invoices/queries";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { billingMonths, type InvoiceStatus } from "@/lib/domain/fees";
import { formatDate, formatXOF } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("invoices") };
}

type SearchParams = PageProps<"/[locale]/direction/finances/factures">["searchParams"];

const STATUSES = ["open", "overdue", "partial", "paid", "cancelled"] as const satisfies readonly InvoiceStatus[];
const monthLabel = (month: string) =>
  new Date(`${month}-01T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Mois affiché par défaut : le mois en cours s'il est facturé, sinon le premier mois de l'année. */
function defaultMonth(months: string[], today: string) {
  return months.find((month) => month === today.slice(0, 7)) ?? months[0]!;
}

async function Invoices({ searchParams }: { searchParams: SearchParams }) {
  const [params, { entry }, t] = await Promise.all([searchParams, requireSpace("direction"), getTranslations("invoices")]);
  const schoolId = entry.schoolId!;
  const schedule = await getFeeSchedule(schoolId);
  if (!schedule) return <EmptyState icon={CalendarX2} title={t("noYear")} body={t("noYearHint")} />;

  const today = todayInDakar();
  const months = billingMonths(schedule.schedule);
  const month =
    params.mois === "tous"
      ? null
      : params.mois === "annuel"
        ? "annual"
        : (months.find((m) => m === params.mois) ?? defaultMonth(months, today));
  const status = STATUSES.find((s) => s === params.statut) ?? null;
  const q = typeof params.q === "string" ? normalize(params.q.trim()) : "";

  const all = await listInvoices(schoolId, schedule.year.id, month, today);
  const live = all.filter((invoice) => invoice.status !== "cancelled");
  const totals = {
    issued: live.reduce((sum, invoice) => sum + invoice.total, 0),
    paid: live.reduce((sum, invoice) => sum + Math.min(invoice.amountPaid, invoice.total), 0),
  };
  const invoices = all.filter(
    (invoice) =>
      (!status || invoice.status === status) &&
      (!q || normalize(`${invoice.studentName} ${invoice.number} ${invoice.className ?? ""}`).includes(q)),
  );
  const canIssue = permissions.manageFinance(entry.roles);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-3 sm:flex sm:flex-wrap">
          <FilterSelect
            param="mois"
            label={t("period")}
            allLabel={t("allPeriods")}
            allValue="tous"
            value={month === null ? "tous" : month === "annual" ? "annuel" : month}
            options={[
              ...months.map((m) => ({ value: m, label: t("monthly", { month: monthLabel(m) }) })),
              { value: "annuel", label: t("annual") },
            ]}
          />
          <FilterSelect
            param="statut"
            label={t("status")}
            allLabel={t("allStatuses")}
            options={STATUSES.map((s) => ({ value: s, label: t(`statuses.${s}`) }))}
          />
          <SearchInput placeholder={t("searchPlaceholder")} label={t("search")} />
        </div>
        {canIssue && <IssueInvoicesSheet yearId={schedule.year.id} months={months} defaultMonth={defaultMonth(months, today)} />}
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["issuedTotal", totals.issued],
            ["paidTotal", totals.paid],
            ["dueTotal", totals.issued - totals.paid],
          ] as const
        ).map(([key, value]) => (
          <div key={key} className="rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70">
            <dt className="text-sm text-muted-foreground">{t(key)}</dt>
            <dd className="tabular mt-1 text-xl font-bold text-ink">{formatXOF(value)}</dd>
          </div>
        ))}
      </dl>

      {invoices.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={all.length === 0 ? t("empty") : t("noResults")}
          body={all.length === 0 && canIssue ? t("emptyHint") : undefined}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{t("count", { count: invoices.length })}</p>
          <ul className="grid gap-2" aria-label={t("listLabel")}>
            {invoices.map((invoice) => (
              <li key={invoice.id}>
                <Link
                  href={`/direction/finances/factures/${invoice.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-white px-4 py-3 shadow-card ring-1 ring-line/70 hover:bg-azure-50/60"
                >
                  <span className="min-w-0 flex-1 basis-56">
                    <span className="block truncate font-semibold text-ink">{invoice.studentName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[invoice.className, invoice.number, invoice.label].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="tabular text-right text-sm">
                    <span className="block font-semibold text-ink">{formatXOF(invoice.total)}</span>
                    {invoice.status !== "paid" && invoice.status !== "cancelled" && invoice.amountPaid > 0 && (
                      <span className="block text-xs text-muted-foreground">
                        {t("remaining", { amount: formatXOF(invoice.total - invoice.amountPaid) })}
                      </span>
                    )}
                  </span>
                  <span className="flex w-40 flex-col items-start gap-0.5 sm:items-end">
                    <InvoiceStatusPill status={invoice.status} />
                    <span className="text-xs text-muted-foreground">
                      {t("dueOn", { date: formatDate(invoice.dueOn, { day: "numeric", month: "short" }) })}
                    </span>
                  </span>
                  <ChevronRight className="hidden size-4 text-muted-foreground sm:block" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default async function InvoicesPage({ searchParams }: PageProps<"/[locale]/direction/finances/factures">) {
  const [t, tNav] = await Promise.all([getTranslations("invoices"), getTranslations("nav")]);
  return (
    <>
      <PageHeader title={tNav("invoices")} description={t("description")} />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Invoices searchParams={searchParams} />
      </Suspense>
    </>
  );
}
