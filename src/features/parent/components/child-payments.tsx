import { Download, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { PaymentStatusPill } from "@/features/payments/components/payment-status";
import type { PaymentRow } from "@/features/payments/queries";
import { Link } from "@/i18n/navigation";
import { formatDate, formatXOF } from "@/lib/format";
import type { ChildBalance } from "../queries";

/** Fiche enfant du parent : reste à payer, accès au paiement en ligne, derniers reçus à télécharger. */
export async function ChildPayments({
  childId,
  firstName,
  balance,
  payments,
}: {
  childId: string;
  firstName: string;
  balance: ChildBalance | undefined;
  payments: PaymentRow[];
}) {
  const [t, tPayments] = await Promise.all([getTranslations("parentSpace"), getTranslations("payments")]);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="child-payments" className="text-lg font-semibold">
          {t("paymentsTitle")}
        </h2>
        {balance ? (
          <Link href={`/parent/paiements#enfant-${childId}`} className={buttonVariants({ size: "sm" })}>
            <Wallet aria-hidden />
            {t("paymentsPay", { amount: formatXOF(balance.due) })}
          </Link>
        ) : (
          <p className="text-sm font-medium text-success-700">{t("paymentsUpToDate", { name: firstName })}</p>
        )}
      </div>
      {balance && balance.overdue > 0 && (
        <p className="mt-1 text-sm font-medium text-danger-700">{t("paymentsOverdue", { amount: formatXOF(balance.overdue) })}</p>
      )}
      {payments.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("paymentsEmpty")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line" aria-label={t("paymentsReceipts")}>
          {payments.slice(0, 5).map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{payment.number}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatDate(payment.receivedOn, { day: "numeric", month: "short" })} · {tPayments(`methods.${payment.method}`)}
                </span>
              </span>
              <span className="tabular font-medium">{formatXOF(payment.amount)}</span>
              <PaymentStatusPill status={payment.status} />
              <a
                href={`/api/recus/${payment.id}`}
                aria-label={t("paymentsDownload", { number: payment.number })}
                className="inline-flex size-10 items-center justify-center rounded-full text-azure-700 hover:bg-azure-50"
              >
                <Download className="size-4" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
