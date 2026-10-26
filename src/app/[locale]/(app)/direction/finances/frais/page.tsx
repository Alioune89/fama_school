import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarX2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { FeeGrid } from "@/features/fees/components/fee-grid";
import { FeeTypesList } from "@/features/fees/components/fee-types-list";
import { getFeeSchedule } from "@/features/fees/queries";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("feeSchedule") };
}

async function FeeSchedulePanel() {
  const [{ entry }, t] = await Promise.all([requireSpace("direction"), getTranslations("fees")]);
  const data = await getFeeSchedule(entry.schoolId!);
  if (!data) return <EmptyState icon={CalendarX2} title={t("noYear")} body={t("noYearHint")} />;
  const canEdit = permissions.manageFinance(entry.roles);
  return (
    <div className="space-y-5">
      <FeeTypesList feeTypes={data.feeTypes} canEdit={canEdit} />
      <FeeGrid key={`${data.year.id}:${data.feeTypes.map((f) => f.id).join()}`} data={data} canEdit={canEdit} />
    </div>
  );
}

export default async function FeeSchedulePage() {
  const [t, tNav] = await Promise.all([getTranslations("fees"), getTranslations("nav")]);
  return (
    <>
      <PageHeader title={tNav("feeSchedule")} description={t("description")} />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <FeeSchedulePanel />
      </Suspense>
    </>
  );
}
