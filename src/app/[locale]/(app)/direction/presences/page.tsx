import { Suspense } from "react";
import type { Metadata } from "next";
import { IdCard, ScanQrCode } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { AttendanceTabs } from "@/features/attendance/components/attendance-tabs";
import { DailyOverview, DailyOverviewSkeleton } from "@/features/attendance/components/daily-overview";
import { DayNav } from "@/features/attendance/components/day-nav";
import { isValidDay } from "@/features/attendance/report";
import { todayInDakar } from "@/features/dashboard/calendar";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("attendance") };
}

async function Day({ searchParams }: { searchParams: PageProps<"/[locale]/direction/presences">["searchParams"] }) {
  const [params] = await Promise.all([searchParams, requireSpace("direction")]);
  const today = todayInDakar();
  const date = isValidDay(params.date) && params.date <= today ? params.date : today;
  return (
    <>
      <div className="mb-5">
        <DayNav date={date} today={today} />
      </div>
      <DailyOverview date={date} today={today} />
    </>
  );
}

export default async function AttendancePage({ searchParams }: PageProps<"/[locale]/direction/presences">) {
  const t = await getTranslations("attendance.direction");
  const tNav = await getTranslations("nav");
  const tArrivals = await getTranslations("arrivals");
  return (
    <>
      <PageHeader
        title={tNav("attendance")}
        description={t("hint")}
        actions={
          <>
            <Link href="/direction/presences/cartes" className={buttonVariants({ variant: "outline" })}>
              <IdCard aria-hidden />
              {tArrivals("cards")}
            </Link>
            <Link href="/direction/presences/pointage" className={buttonVariants()}>
              <ScanQrCode aria-hidden />
              {tArrivals("action")}
            </Link>
          </>
        }
      />
      <AttendanceTabs active="day" />
      <Suspense fallback={<DailyOverviewSkeleton />}>
        <Day searchParams={searchParams} />
      </Suspense>
    </>
  );
}
