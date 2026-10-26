import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronRight, Plus, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { FilterSelect } from "@/components/data/filter-select";
import { SearchInput } from "@/components/data/search-input";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { todayInDakar } from "@/features/dashboard/calendar";
import { PaymentStatusPill } from "@/features/payments/components/payment-status";
import { listPayments, listPendingCancellations } from "@/features/payments/queries";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { shiftMonth } from "@/lib/domain/fees";
import { formatDate, formatXOF } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("feesCollection") };
}

type SearchParams = PageProps<"/[locale]/direction/finances/encaissements">["searchParams"];

const monthLabel = (month: string) =>
  new Date(`${month}-01T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Encaissements d'un mois (?mois=2026-10, le mois en cours par défaut), avec recherche (?q=). */
async function Payments({ searchParams }: { searchParams: SearchParams }) {
  const [params, { entry }, t] = await Promise.all([searchParams, requireSpace("direction"), getTranslations("payments")]);
  const schoolId = entry.schoolId!;
  const current = todayInDakar().slice(0, 7);
  const months = Array.from({ length: 12 }, (_, index) => shiftMonth(current, -index));
  const month = months.find((m) => m === params.mois) ?? current;
  const q = typeof params.q === "string" ? normalize(params.q.trim()) : "";

  const [all, pending] = await Promise.all([listPayments(schoolId, month), listPendingCancellations(schoolId)]);
  const counted = all.filter((payment) => payment.status !== "cancelled");
  const total = counted.reduce((sum, payment) => sum + payment.amount, 0);
  const byMethod = [...new Set(counted.map((payment) => payment.method))].map((method) => ({
    method,
    amount: counted.filter((payment) => payment.method === method).reduce((sum, payment) => sum + payment.amount, 0),
  }));
  const payments = all.filter(
    (payment) => !q || normalize(`${payment.studentName} ${payment.matricule} ${payment.number}`).includes(q),
  );
  const canCollect = permissions.manageFinance(entry.roles);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-3 sm:flex sm:flex-wrap">
          <FilterSelect
            param="mois"
            label={t("month")}
            allLabel={monthLabel(current)}
            allValue={current}
            value={month}
            options={months.slice(1).map((m) => ({ value: m, label: monthLabel(m) }))}
          />
          <SearchInput placeholder={t("searchPlaceholder")} label={t("search")} />
        </div>
        {canCollect && (
          <Link href="/direction/finances/encaissements/nouveau" className={buttonVariants()}>
            <Plus aria-hidden />
            {t("newPayment")}
          </Link>
        )}
      </div>

      {pending.length > 0 && (
        <section className="rounded-xl bg-warning-50 p-4 ring-1 ring-warning-500/30" aria-labelledby="pending-cancellations">
          <h2 id="pending-cancellations" className="text-sm font-semibold text-warning-700">
            {t("pendingTitle", { count: pending.length })}
          </h2>
          <ul className="mt-2 space-y-1 text-sm">
            {pending.map((payment) => (
              <li key={payment.id}>
                <Link href={`/direction/finances/encaissements/${payment.id}`} className="font-medium text-ink hover:underline">
                  {payment.number} · {payment.studentName} · {formatXOF(payment.amount)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <div className="rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70">
          <p className="text-sm text-muted-foreground">{t("monthTotal")}</p>
          <p className="tabular mt-1 text-2xl font-bold text-ink">{formatXOF(total)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70">
          <p className="text-sm text-muted-foreground">{t("byMethod")}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {byMethod.length === 0 ? (
              <li className="text-sm text-muted-foreground">—</li>
            ) : (
              byMethod.map(({ method, amount }) => (
                <li key={method} className="tabular rounded-full bg-azure-50 px-3 py-1 text-sm">
                  <span className="text-ink-soft">{t(`methods.${method}`)} :</span>{" "}
                  <span className="font-semibold">{formatXOF(amount)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {payments.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={all.length === 0 ? t("empty") : t("noResults")}
          body={all.length === 0 && canCollect ? t("emptyHint") : undefined}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{t("count", { count: payments.length })}</p>
          <ul className="grid gap-2" aria-label={t("listLabel")}>
            {payments.map((payment) => (
              <li key={payment.id}>
                <Link
                  href={`/direction/finances/encaissements/${payment.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-white px-4 py-3 shadow-card ring-1 ring-line/70 hover:bg-azure-50/60"
                >
                  <span className="min-w-0 flex-1 basis-56">
                    <span className="block truncate font-semibold text-ink">{payment.studentName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {payment.number} · {formatDate(payment.receivedOn, { day: "numeric", month: "short" })} ·{" "}
                      {t(`methods.${payment.method}`)}
                    </span>
                  </span>
                  <span className="tabular font-semibold text-ink">{formatXOF(payment.amount)}</span>
                  <PaymentStatusPill status={payment.status} />
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

export default async function PaymentsPage({ searchParams }: PageProps<"/[locale]/direction/finances/encaissements">) {
  const [t, tNav] = await Promise.all([getTranslations("payments"), getTranslations("nav")]);
  return (
    <>
      <PageHeader title={tNav("feesCollection")} description={t("description")} />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Payments searchParams={searchParams} />
      </Suspense>
    </>
  );
}
