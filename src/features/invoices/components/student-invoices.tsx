import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatXOF } from "@/lib/format";
import type { InvoiceRow } from "../queries";
import { InvoiceStatusPill } from "./invoice-status";

/** Factures d'un élève (fiche élève de la direction) et reste à payer. */
export async function StudentInvoices({ invoices }: { invoices: InvoiceRow[] }) {
  const t = await getTranslations("invoices");
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
    </section>
  );
}
