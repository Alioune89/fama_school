import { Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { PaymentStatusPill } from "@/features/payments/components/payment-status";
import type { PaymentRow } from "@/features/payments/queries";
import { Link } from "@/i18n/navigation";
import { formatDate, formatXOF } from "@/lib/format";
import type { InvoiceRow } from "../queries";
import { InvoiceStatusPill } from "./invoice-status";

/** Factures et reçus d'un élève (fiche élève de la direction), reste à payer et accès au guichet. */
export async function StudentInvoices({
  studentId,
  invoices,
  payments,
  canCollect,
}: {
  studentId: string;
  invoices: InvoiceRow[];
  payments: PaymentRow[];
  canCollect: boolean;
}) {
  const [t, tPayments] = await Promise.all([getTranslations("invoices"), getTranslations("payments")]);
  const due = invoices
    .filter((invoice) => invoice.status !== "cancelled")
    .reduce((sum, invoice) => sum + Math.max(0, invoice.total - invoice.amountPaid), 0);
  return (
    <section aria-labelledby="student-invoices" className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="student-invoices" className="text-lg font-semibold">
          {t("studentTitle")}
        </h2>
        {invoices.length > 0 && (
          <p className={due > 0 ? "text-sm font-semibold text-danger-700" : "text-sm font-semibold text-success-700"}>
            {t("studentBalance", { amount: formatXOF(due) })}
          </p>
        )}
      </div>
      {invoices.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("studentEmpty")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {invoices.map((invoice) => (
            <li key={invoice.id}>
              <Link
                href={`/direction/finances/factures/${invoice.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm hover:text-azure-700"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{invoice.label}</span>
                  <span className="block text-xs text-muted-foreground">{invoice.number}</span>
                </span>
                <span className="tabular font-medium">{formatXOF(invoice.total)}</span>
                <InvoiceStatusPill status={invoice.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {canCollect && due > 0 && (
        <Link href={`/direction/finances/encaissements/nouveau?eleve=${studentId}`} className={`${buttonVariants()} mt-3`}>
          <Wallet aria-hidden />
          {tPayments("collect")}
        </Link>
      )}

      <h3 className="mt-6 text-sm font-semibold text-ink-soft">{tPayments("studentTitle")}</h3>
      {payments.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">{tPayments("studentEmpty")}</p>
      ) : (
        <ul className="mt-1 divide-y divide-line">
          {payments.map((payment) => (
            <li key={payment.id}>
              <Link
                href={`/direction/finances/encaissements/${payment.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm hover:text-azure-700"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{payment.number}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatDate(payment.receivedOn, { day: "numeric", month: "short" })} ·{" "}
                    {tPayments(`methods.${payment.method}`)}
                  </span>
                </span>
                <span className="tabular font-medium">{formatXOF(payment.amount)}</span>
                <PaymentStatusPill status={payment.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
