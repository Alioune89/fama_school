import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronLeft, Download } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { ReportCardPreview } from "@/features/report-cards/components/report-card-preview";
import { getReportCard } from "@/features/report-cards/queries";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reportCardsAdmin");
  return { title: t("title") };
}

/** Aperçu d'un bulletin pour la direction, avec retour à la classe et téléchargement du PDF. */
async function Preview({ params }: { params: PageProps<"/[locale]/direction/notes/bulletins/[id]">["params"] }) {
  const [{ id }, { entry }, t] = await Promise.all([params, requireSpace("direction"), getTranslations("reportCardsAdmin")]);
  const card = await getReportCard(id);
  if (!card || card.schoolId !== entry.schoolId) notFound();
  const { student, className, periodLabel } = card.data;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link
            href={`/direction/notes/bulletins?classe=${card.classId}&periode=${card.periodId}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink"
          >
            <ChevronLeft className="size-4" aria-hidden />
            {t("back")}
          </Link>
          <h1 className="text-2xl font-bold">
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {className} · {periodLabel}
          </p>
        </div>
        <a href={`/api/bulletins/${card.id}`} download className={buttonVariants()}>
          <Download aria-hidden />
          {t("download")}
        </a>
      </div>
      <ReportCardPreview card={card} />
    </>
  );
}

export default function ReportCardPreviewPage({ params }: PageProps<"/[locale]/direction/notes/bulletins/[id]">) {
  return (
    <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
      <Preview params={params} />
    </Suspense>
  );
}
