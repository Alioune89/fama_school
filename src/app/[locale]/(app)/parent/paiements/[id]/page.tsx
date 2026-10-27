import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PaymentTracker } from "@/features/online-payments/components/payment-tracker";
import { getOnlinePayment } from "@/features/online-payments/queries";
import { Link } from "@/i18n/navigation";
import { formatXOF } from "@/lib/format";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onlinePayments");
  return { title: t("statusTitle") };
}

/** Retour de la page de paiement (réussite ou abandon) : l'état se met à jour dès que l'opérateur confirme. */
async function OnlinePaymentStatus({ params }: { params: PageProps<"/[locale]/parent/paiements/[id]">["params"] }) {
  const [{ id }, { user }] = await Promise.all([params, requireSpace("parent")]);
  const payment = /^[0-9a-f-]{36}$/.test(id) ? await getOnlinePayment(id) : null;
  if (!payment || payment.createdBy !== user.id) notFound();
  const t = await getTranslations("onlinePayments");
  return (
    <section className="max-w-xl rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
      <h1 className="text-2xl font-bold">{t("statusTitle")}</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        {t("forChild", { amount: formatXOF(payment.amount), name: payment.studentName })}
      </p>
      <PaymentTracker
        id={payment.id}
        initialStatus={payment.status}
        initialPaymentId={payment.paymentId}
        checkoutUrl={payment.checkoutUrl}
      />
    </section>
  );
}

export default async function OnlinePaymentPage({ params }: PageProps<"/[locale]/parent/paiements/[id]">) {
  const t = await getTranslations("onlinePayments");
  return (
    <>
      <Link
        href="/parent/paiements"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <Suspense fallback={<div className="h-64 max-w-xl animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <OnlinePaymentStatus params={params} />
      </Suspense>
    </>
  );
}
