import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StaffDetail, StaffDetailSkeleton } from "@/features/staff/components/staff-detail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("staff") };
}

async function StaffMemberDetail({ params }: { params: PageProps<"/[locale]/direction/personnel/[id]">["params"] }) {
  const { id } = await params;
  return <StaffDetail id={id} kind="staff" />;
}

export default function StaffMemberPage({ params }: PageProps<"/[locale]/direction/personnel/[id]">) {
  return (
    <Suspense fallback={<StaffDetailSkeleton />}>
      <StaffMemberDetail params={params} />
    </Suspense>
  );
}
