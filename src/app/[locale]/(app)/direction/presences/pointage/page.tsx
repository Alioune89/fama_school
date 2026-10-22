import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronLeft, IdCard, ShieldX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { ArrivalScanner } from "@/features/arrivals/components/arrival-scanner";
import { ArrivalScannerFallback } from "@/features/arrivals/components/arrival-scanner-fallback";
import { listArrivals, listBadges } from "@/features/arrivals/queries";
import { todayInDakar } from "@/features/dashboard/calendar";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("arrivals");
  return { title: t("title") };
}

async function Scanner() {
  const { user, entry } = await requireSpace("direction");
  const t = await getTranslations("arrivals");
  if (!permissions.recordArrivals(entry.roles)) {
    return <EmptyState icon={ShieldX} title={t("forbiddenTitle")} body={t("forbiddenBody")} />;
  }
  const schoolId = entry.schoolId!;
  const date = todayInDakar();
  const [badges, arrivals] = await Promise.all([listBadges(schoolId), listArrivals({ schoolId }, date)]);
  return <ArrivalScanner userId={user.id} snapshot={{ schoolId, date, badges, arrivals: Object.fromEntries(arrivals) }} />;
}

/** Pointage à l'entrée de l'école : scan des cartes d'élève avec la caméra du téléphone. */
export default async function ArrivalsPage() {
  const t = await getTranslations("arrivals");
  const tDirection = await getTranslations("attendance.direction");
  return (
    <>
      <Link
        href="/direction/presences"
        className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {tDirection("backToDay")}
      </Link>
      <PageHeader
        title={t("title")}
        description={t("hint")}
        actions={
          <Link href="/direction/presences/cartes" className={buttonVariants({ variant: "outline" })}>
            <IdCard aria-hidden />
            {t("cards")}
          </Link>
        }
      />
      <Suspense fallback={<ArrivalScannerFallback />}>
        <Scanner />
      </Suspense>
    </>
  );
}
