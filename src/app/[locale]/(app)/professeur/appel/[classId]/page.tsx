import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { RollCallBoard } from "@/features/attendance/components/roll-call-board";
import { RollCallFallback } from "@/features/attendance/components/roll-call-fallback";
import { getRollCall } from "@/features/attendance/queries";
import { defaultSlot } from "@/features/attendance/roll-call";
import { todayInDakar } from "@/features/dashboard/calendar";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("rollCall") };
}

async function RollCall({ params }: { params: PageProps<"/[locale]/professeur/appel/[classId]">["params"] }) {
  const [{ classId }, { user, entry }] = await Promise.all([params, requireSpace("professeur")]);
  const data = await getRollCall(entry.schoolId!, user.id, classId, todayInDakar());
  if (!data) notFound();
  return <RollCallBoard userId={user.id} data={data} initialSlot={defaultSlot()} />;
}

export default async function ClassRollCallPage({ params }: PageProps<"/[locale]/professeur/appel/[classId]">) {
  const t = await getTranslations("attendance.rollCall");
  return (
    <>
      <Link
        href="/professeur/appel"
        className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <PageHeader title={t("title")} description={t("hint")} />
      <Suspense fallback={<RollCallFallback />}>
        <RollCall params={params} />
      </Suspense>
    </>
  );
}
