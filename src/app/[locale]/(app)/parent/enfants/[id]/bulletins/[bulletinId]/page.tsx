import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronLeft, Download } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { listMyChildren } from "@/features/parent/queries";
import { ReportCardPreview } from "@/features/report-cards/components/report-card-preview";
import { getReportCard } from "@/features/report-cards/queries";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parentSpace");
  return { title: t("reportCardsTitle") };
}

type Params = PageProps<"/[locale]/parent/enfants/[id]/bulletins/[bulletinId]">["params"];

/** Bulletin publié d'un enfant, consulté par son parent, avec téléchargement du PDF. */
async function ChildReportCard({ params }: { params: Params }) {
  const [{ id, bulletinId }, { user }, t] = await Promise.all([params, requireSpace("parent"), getTranslations("parentSpace")]);
  const child = (await listMyChildren(user.id)).find((c) => c.id === id);
  const card = child ? await getReportCard(bulletinId) : null;
  if (!child || !card || card.studentId !== child.id || !card.publishedAt) notFound();
  const tAdmin = await getTranslations("reportCardsAdmin");
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
        <a href={`/api/bulletins/${card.id}`} download className={buttonVariants()}>
          <Download aria-hidden />
          {tAdmin("download")}
        </a>
      </div>
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
