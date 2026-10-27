import { Suspense } from "react";
import type { Metadata } from "next";
import { Download, FlaskConical, UsersRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PersonAvatar } from "@/components/people/person-avatar";
import { todayInDakar } from "@/features/dashboard/calendar";
import { listStudentInvoices } from "@/features/invoices/queries";
import { PayOnlineForm } from "@/features/online-payments/components/pay-online-form";
import { activeProvider } from "@/features/online-payments/providers";
import { listMyChildren } from "@/features/parent/queries";
import { PaymentStatusPill } from "@/features/payments/components/payment-status";
import { listStudentPayments } from "@/features/payments/queries";
import { formatDate, formatXOF } from "@/lib/format";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onlinePayments");
  return { title: t("title") };
}

const card = "rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6";

/** Par enfant : reste à payer, paiement en ligne des factures dues, reçus à télécharger. */
async function ChildrenPayments() {
  const { user } = await requireSpace("parent");
  const today = todayInDakar();
  const children = await listMyChildren(user.id);
  const [t, tPayments] = await Promise.all([getTranslations("onlinePayments"), getTranslations("payments")]);
  if (children.length === 0) return <EmptyState icon={UsersRound} title={t("title")} body={t("noChildren")} />;

  const finances = await Promise.all(
    children.map(async (child) => {
      const [invoices, payments] = await Promise.all([listStudentInvoices(child.id, today), listStudentPayments(child.id)]);
      return { child, invoices, payments };
    }),
  );

  const provider = activeProvider();
  return (
    <div className="space-y-6">
      {provider?.name === "simulated" && (
        <p className="flex items-center gap-2 rounded-xl bg-sun-100 px-4 py-3 text-sm font-medium text-ink">
          <FlaskConical className="size-4 shrink-0" aria-hidden />
          {t("demoNotice")}
        </p>
      )}
      {finances.map(({ child, invoices, payments }) => {
        const name = `${child.firstName} ${child.lastName}`;
        const due = invoices
          .filter((invoice) => invoice.status !== "cancelled" && invoice.amountPaid < invoice.total)
          .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.number.localeCompare(b.number));
        const balance = due.reduce((sum, invoice) => sum + invoice.total - invoice.amountPaid, 0);
        return (
          <section key={child.id} id={`enfant-${child.id}`} aria-labelledby={`pay-${child.id}`} className={card}>
            <div className="flex flex-wrap items-center gap-3">
              <PersonAvatar name={name} />
              <div className="min-w-0 flex-1">
                <h2 id={`pay-${child.id}`} className="text-lg font-semibold">
                  {name}
                </h2>
                <p className="text-sm text-muted-foreground">{[child.className, child.schoolName].filter(Boolean).join(" · ")}</p>
              </div>
              {balance > 0 && (
                <p className="text-sm font-semibold text-danger-700">{t("balance", { amount: formatXOF(balance) })}</p>
              )}
            </div>

            <div className="mt-4">
              {balance === 0 ? (
                <p className="text-sm font-medium text-success-700">{t("upToDate", { name: child.firstName })}</p>
              ) : !provider ? (
                <p className="text-sm text-ink-soft">{t("closed", { count: due.length })}</p>
              ) : (
                <PayOnlineForm
                  studentId={child.id}
                  invoices={due.map((invoice) => ({
                    id: invoice.id,
                    number: invoice.number,
                    label: invoice.label,
                    dueOn: invoice.dueOn,
                    remaining: invoice.total - invoice.amountPaid,
                  }))}
                />
              )}
            </div>

            <h3 className="mt-6 text-sm font-semibold text-ink-soft">{t("receipts")}</h3>
            {payments.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">{t("noReceipts")}</p>
            ) : (
              <ul className="mt-1 divide-y divide-line" aria-label={t("receipts")}>
                {payments.map((payment) => (
                  <li key={payment.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">
                        {t("receiptLine", {
                          number: payment.number,
                          date: formatDate(payment.receivedOn, { day: "numeric", month: "short" }),
                          method: tPayments(`methods.${payment.method}`),
                        })}
                      </span>
                    </span>
                    <span className="tabular font-medium">{formatXOF(payment.amount)}</span>
                    <PaymentStatusPill status={payment.status} />
                    <a
                      href={`/api/recus/${payment.id}`}
                      aria-label={t("downloadReceipt", { number: payment.number })}
                      className="inline-flex size-10 items-center justify-center rounded-full text-azure-700 hover:bg-azure-50"
                    >
                      <Download className="size-4" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default async function ParentPaymentsPage() {
  const t = await getTranslations("onlinePayments");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <ChildrenPayments />
      </Suspense>
    </>
  );
}
