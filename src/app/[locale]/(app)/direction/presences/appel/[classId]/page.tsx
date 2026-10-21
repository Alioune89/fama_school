import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { RollCallBoard } from "@/features/attendance/components/roll-call-board";
import { RollCallFallback } from "@/features/attendance/components/roll-call-fallback";
import { loadRollCall } from "@/features/attendance/queries";
import { defaultSlot } from "@/features/attendance/roll-call";
import { todayInDakar } from "@/features/dashboard/calendar";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("attendance") };
}

/** Appel fait par la direction ou la surveillance (enseignant absent, classe sans appel). */
async function RollCall({ params }: { params: PageProps<"/[locale]/direction/presences/appel/[classId]">["params"] }) {
  const [{ classId }, { user, entry }] = await Promise.all([params, requireSpace("direction")]);
  if (!permissions.takeAttendance(entry.roles)) notFound();
  const data = await loadRollCall(entry.schoolId!, classId, todayInDakar());
  if (!data) notFound();
  return <RollCallBoard userId={user.id} data={data} initialSlot={defaultSlot()} />;
}

export default async function DirectionRollCallPage({ params }: PageProps<"/[locale]/direction/presences/appel/[classId]">) {
  const t = await getTranslations("attendance.rollCall");
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
      <PageHeader title={t("title")} description={t("hint")} />
      <Suspense fallback={<RollCallFallback />}>
        <RollCall params={params} />
      </Suspense>
    </>
  );
}
