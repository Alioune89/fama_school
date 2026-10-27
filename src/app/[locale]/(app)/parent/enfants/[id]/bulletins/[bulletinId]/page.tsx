import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronLeft, Download, Lock } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { listMyChildren } from "@/features/parent/queries";
import { ReportCardPreview } from "@/features/report-cards/components/report-card-preview";
import { getReportCard, isReportCardDownloadBlocked } from "@/features/report-cards/queries";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parentSpace");
  return { title: t("reportCardsTitle") };
}

type Params = PageProps<"/[locale]/parent/enfants/[id]/bulletins/[bulletinId]">["params"];

/** Bulletin publié d'un enfant, consulté par son parent, avec téléchargement du PDF (sauf impayé, si l'école l'a choisi). */
async function ChildReportCard({ params }: { params: Params }) {
  const [{ id, bulletinId }, { user }, t] = await Promise.all([params, requireSpace("parent"), getTranslations("parentSpace")]);
  const child = (await listMyChildren(user.id)).find((c) => c.id === id);
  const card = child ? await getReportCard(bulletinId) : null;
  if (!child || !card || card.studentId !== child.id || !card.publishedAt) notFound();
  const [tAdmin, blocked] = await Promise.all([getTranslations("reportCardsAdmin"), isReportCardDownloadBlocked(card.id)]);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link
            href={`/parent/enfants/${child.id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink"
          >
            <ChevronLeft className="size-4" aria-hidden />
            {t("reportCardBack", { name: child.firstName })}
          </Link>
          <h1 className="text-2xl font-bold">{t("reportCardOpen", { period: card.data.periodLabel })}</h1>
          <p className="text-sm text-muted-foreground">
            {child.firstName} {child.lastName} · {card.data.className}
          </p>
        </div>
        {!blocked && (
          <a href={`/api/bulletins/${card.id}`} download className={buttonVariants()}>
            <Download aria-hidden />
            {tAdmin("download")}
          </a>
        )}
      </div>
      {blocked && (
        <div role="note" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-sun-100 px-4 py-3 text-sm print:hidden">
          <Lock className="size-4 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1">{t("reportCardBlocked")}</p>
          <Link href={`/parent/paiements#enfant-${child.id}`} className={buttonVariants({ size: "sm" })}>
            {t("reportCardBlockedPay")}
          </Link>
        </div>
      )}
      <ReportCardPreview card={card} />
    </>
  );
}

export default function ChildReportCardPage({ params }: PageProps<"/[locale]/parent/enfants/[id]/bulletins/[bulletinId]">) {
  return (
    <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
      <ChildReportCard params={params} />
    </Suspense>
  );
}
