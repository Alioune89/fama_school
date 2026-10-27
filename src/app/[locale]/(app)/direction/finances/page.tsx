import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarX2, ChevronRight, TriangleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { KpiCard, KpiCardSkeleton } from "@/components/dashboard/kpi-card";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { CollectionChart } from "@/features/collections/components/collection-chart";
import { todayInDakar } from "@/features/dashboard/calendar";
import { listExpenses } from "@/features/expenses/queries";
import { getFeeSchedule } from "@/features/fees/queries";
import { listInvoices } from "@/features/invoices/queries";
import { listPayments } from "@/features/payments/queries";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";
import { summarizeCollections } from "@/lib/domain/collections";
import { billingMonths } from "@/lib/domain/fees";
import { formatXOF } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("collections");
  return { title: t("title") };
}

const monthName = (month: string, style: "long" | "short") =>
  new Date(`${month}-01T12:00:00Z`).toLocaleDateString("fr-FR", {
    month: style,
    ...(style === "long" ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });

const card = "rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6";

/** Vue d'ensemble de l'année : facturé, encaissé, reste et retard ; détail par mois ; recettes et dépenses du mois. */
async function Overview() {
  const [{ entry }, t] = await Promise.all([requireSpace("direction"), getTranslations("collections")]);
  const schoolId = entry.schoolId!;
  const schedule = await getFeeSchedule(schoolId);
  if (!schedule) return <EmptyState icon={CalendarX2} title={t("noYear")} body={t("noYearHint")} />;

  const today = todayInDakar();
  const month = today.slice(0, 7);
  const months = billingMonths(schedule.schedule);
  const [invoices, payments, expenses] = await Promise.all([
    listInvoices(schoolId, schedule.year.id, null, today),
    listPayments(schoolId, month),
    listExpenses(schoolId, month),
  ]);
  const summary = summarizeCollections(invoices, months, today);
  const received = payments.filter((payment) => payment.status !== "cancelled").reduce((sum, payment) => sum + payment.amount, 0);
  const spent = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="space-y-6">
      <section aria-label={t("yearTotals", { year: schedule.year.label })} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard tone="azure" label={t("billed")} value={formatXOF(summary.billed)} />
        <KpiCard tone="lavender" label={t("collected")} value={formatXOF(summary.collected)} />
        <KpiCard tone="white" label={t("remaining")} value={formatXOF(summary.remaining)} />
        <KpiCard tone="sun" label={t("overdue")} value={formatXOF(summary.overdue)} />
      </section>

      {summary.overdueStudents > 0 && (
        <Link
          href="/direction/finances/impayes"
          className="flex items-center gap-3 rounded-xl bg-danger-50 px-4 py-3 text-sm font-medium text-danger-700 ring-1 ring-danger-500/20 hover:ring-danger-500/50"
        >
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            {t("overdueBanner", { count: summary.overdueStudents, amount: formatXOF(summary.overdue) })}
          </span>
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      )}

      <section className={card} aria-labelledby="collection-by-month">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="collection-by-month" className="text-lg font-semibold">
            {t("byMonth", { year: schedule.year.label })}
          </h2>
          {summary.rate !== null && (
            <p className="text-sm text-ink-soft">{t("rate", { rate: Math.round(summary.rate * 100) })}</p>
          )}
        </div>
        <CollectionChart
          columns={summary.columns.map((column) => ({
            ...column,
            label: column.key === "annual" ? t("annual") : monthName(column.key, "long"),
            shortLabel: column.key === "annual" ? t("annualShort") : monthName(column.key, "short"),
          }))}
        />
      </section>

      <section className={card} aria-labelledby="collection-this-month">
        <h2 id="collection-this-month" className="text-lg font-semibold">
          {t("thisMonth", { month: monthName(month, "long") })}
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-muted-foreground">{t("received")}</dt>
            <dd className="tabular text-xl font-semibold">{formatXOF(received)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">{t("spent")}</dt>
            <dd className="tabular text-xl font-semibold">{formatXOF(spent)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">{t("balance")}</dt>
            <dd className={`tabular text-xl font-semibold ${received - spent < 0 ? "text-danger-700" : "text-ink"}`}>
              {formatXOF(received - spent)}
            </dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-azure-700">
          <Link href="/direction/finances/encaissements" className="hover:underline">
            {t("seePayments")}
          </Link>
          <Link href="/direction/finances/depenses" className="hover:underline">
            {t("seeExpenses")}
          </Link>
        </div>
      </section>
    </div>
  );
}

export default async function FinancesPage() {
  const t = await getTranslations("collections");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCardSkeleton tone="azure" />
            <KpiCardSkeleton tone="lavender" />
            <KpiCardSkeleton tone="white" />
            <KpiCardSkeleton tone="sun" />
          </div>
        }
      >
        <Overview />
      </Suspense>
    </>
  );
}
