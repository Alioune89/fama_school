import { Suspense } from "react";
import type { Metadata } from "next";
import { FlaskConical } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { SimulationPanel } from "@/features/online-payments/components/simulation-panel";
import { activeProvider } from "@/features/online-payments/providers";
import { getOnlinePayment } from "@/features/online-payments/queries";
import { redirect } from "@/i18n/navigation";
import { formatXOF } from "@/lib/format";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onlinePayments.simulation");
  return { title: t("title") };
}

/** Page de paiement du fournisseur simulé (démonstration, tant que PayDunya n'est pas branché). */
async function Simulation({ params }: { params: PageProps<"/[locale]/parent/paiements/[id]/simulation">["params"] }) {
  const [{ id }, { user }] = await Promise.all([params, requireSpace("parent")]);
  const payment = /^[0-9a-f-]{36}$/.test(id) ? await getOnlinePayment(id) : null;
  if (!payment || payment.createdBy !== user.id || payment.provider !== "simulated" || activeProvider()?.name !== "simulated") {
    notFound();
  }
  if (payment.status !== "pending") redirect({ href: `/parent/paiements/${id}`, locale: await getLocale() });

  const t = await getTranslations("onlinePayments.simulation");
  return (
    <section className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
        <FlaskConical className="size-4" aria-hidden />
        {t("title")}
      </p>
      <p className="mt-4 text-sm text-muted-foreground">{t("amount")}</p>
      <p className="tabular text-3xl font-bold">{formatXOF(payment.amount)}</p>
      <p className="mt-1 text-sm text-ink-soft">{payment.studentName}</p>
      <p className="mt-4 mb-6 rounded-lg bg-sun-100 px-3 py-2 text-sm">{t("hint")}</p>
      <SimulationPanel id={payment.id} />
    </section>
  );
}

export default function SimulationPage({ params }: PageProps<"/[locale]/parent/paiements/[id]/simulation">) {
  return (
    <Suspense fallback={<div className="mx-auto h-80 max-w-md animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
      <Simulation params={params} />
    </Suspense>
  );
}
