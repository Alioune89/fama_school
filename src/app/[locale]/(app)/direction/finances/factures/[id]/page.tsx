import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronLeft, Wallet } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { todayInDakar } from "@/features/dashboard/calendar";
import { CancelInvoiceForm } from "@/features/invoices/components/cancel-invoice-form";
import { InvoiceStatusPill } from "@/features/invoices/components/invoice-status";
import { getInvoice } from "@/features/invoices/queries";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { formatDate, formatXOF } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("invoices") };
}

/** Détail d'une facture : élève, lignes, montants, statut ; annulation tant qu'elle est impayée. */
async function InvoiceDetail({ params }: { params: PageProps<"/[locale]/direction/finances/factures/[id]">["params"] }) {
  const [{ id }, { entry }, t, tPayments] = await Promise.all([
    params,
    requireSpace("direction"),
    getTranslations("invoices"),
    getTranslations("payments"),
  ]);
  const invoice = await getInvoice(entry.schoolId!, id, todayInDakar());
  if (!invoice) notFound();
  const canCancel = permissions.manageFinance(entry.roles) && invoice.status !== "cancelled" && invoice.amountPaid === 0;

  return (
    <>
      <Link
        href={
          invoice.billingMonth
            ? `/direction/finances/factures?mois=${invoice.billingMonth.slice(0, 7)}`
            : "/direction/finances/factures?mois=annuel"
        }
        className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("invoiceTitle", { number: invoice.number })}</h1>
          <p className="text-sm text-muted-foreground">
            <Link href={`/direction/eleves/${invoice.studentId}`} className="font-medium text-azure-700 hover:underline">
              {invoice.studentName}
            </Link>
            {invoice.className && ` · ${invoice.className}`} · {invoice.label}
          </p>
        </div>
        <InvoiceStatusPill status={invoice.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="invoice-lines" className="rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6">
          <h2 id="invoice-lines" className="text-lg font-semibold">
            {t("lines")}
          </h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-2 text-left font-medium">{t("fee")}</th>
                <th className="py-2 text-right font-medium">{t("baseAmount")}</th>
                <th className="py-2 text-right font-medium">{t("amount")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {invoice.lines.map((line) => (
                <tr key={line.id}>
                  <td className="py-2.5">
                    {line.label}
                    {line.discountPercent > 0 && (
                      <span className="ml-2 rounded-full bg-success-50 px-2 py-0.5 text-xs font-semibold text-success-700">
                        −{line.discountPercent} %
                      </span>
                    )}
                  </td>
                  <td className="tabular py-2.5 text-right text-muted-foreground">{formatXOF(line.baseAmount)}</td>
                  <td className="tabular py-2.5 text-right font-medium">{formatXOF(line.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line font-semibold">
                <td className="pt-3">{t("total")}</td>
                <td />
                <td className="tabular pt-3 text-right">{formatXOF(invoice.total)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="space-y-4 rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6">
          <dl className="space-y-2 text-sm">
            {(
              [
                ["issuedOn", formatDate(invoice.issuedOn)],
                ["dueOnLabel", formatDate(invoice.dueOn)],
                ["paid", formatXOF(invoice.amountPaid)],
                ["due", formatXOF(Math.max(0, invoice.total - invoice.amountPaid))],
              ] as const
            ).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t(key)}</dt>
                <dd className="tabular font-medium">{invoice.status === "cancelled" && key === "due" ? "—" : value}</dd>
              </div>
            ))}
          </dl>
          {invoice.status === "cancelled" && (
            <p className="rounded-lg bg-muted p-3 text-sm text-ink-soft">
              {t("cancelledBecause", { reason: invoice.cancelReason ?? "" })}
            </p>
          )}
          {permissions.manageFinance(entry.roles) &&
            (invoice.status === "open" || invoice.status === "overdue" || invoice.status === "partial") && (
              <Link href={`/direction/finances/encaissements/nouveau?eleve=${invoice.studentId}`} className={buttonVariants()}>
                <Wallet aria-hidden />
                {tPayments("collect")}
              </Link>
            )}
          {canCancel && <CancelInvoiceForm invoiceId={invoice.id} />}
        </section>
      </div>
    </>
  );
}

export default function InvoicePage({ params }: PageProps<"/[locale]/direction/finances/factures/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
      <InvoiceDetail params={params} />
    </Suspense>
  );
}
