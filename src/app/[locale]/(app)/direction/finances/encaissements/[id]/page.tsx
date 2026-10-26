import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronLeft, Download } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { CancellationPanel } from "@/features/payments/components/cancellation-panel";
import { PaymentStatusPill } from "@/features/payments/components/payment-status";
import { ReceiptPreview } from "@/features/payments/components/receipt-preview";
import { getPayment } from "@/features/payments/queries";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("feesCollection") };
}

/** Reçu d'un encaissement : aperçu, PDF, annulation en deux temps. */
async function Receipt({ params }: { params: PageProps<"/[locale]/direction/finances/encaissements/[id]">["params"] }) {
  const [{ id }, { user, entry }, t] = await Promise.all([params, requireSpace("direction"), getTranslations("payments")]);
  const payment = await getPayment(id);
  if (!payment || payment.schoolId !== entry.schoolId) notFound();
  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("receiptTitle", { number: payment.number })}</h1>
          <p className="text-sm text-muted-foreground">
            <Link href={`/direction/eleves/${payment.studentId}`} className="font-medium text-azure-700 hover:underline">
              {payment.studentName}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PaymentStatusPill status={payment.status} />
          <a href={`/api/recus/${payment.id}`} download className={buttonVariants()}>
            <Download aria-hidden />
            {t("download")}
          </a>
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[148mm_minmax(0,1fr)]">
        <ReceiptPreview payment={payment} />
        <div className="max-w-md">
          <CancellationPanel
            paymentId={payment.id}
            status={payment.status}
            reason={payment.cancelReason}
            canRequest={permissions.manageFinance(entry.roles)}
            canDecide={permissions.manageSchool(entry.roles) && payment.cancelRequestedBy !== user.id}
          />
        </div>
      </div>
    </>
  );
}

export default async function ReceiptPage({ params }: PageProps<"/[locale]/direction/finances/encaissements/[id]">) {
  const t = await getTranslations("payments");
  return (
    <>
      <Link
        href="/direction/finances/encaissements"
        className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Receipt params={params} />
      </Suspense>
    </>
  );
}
