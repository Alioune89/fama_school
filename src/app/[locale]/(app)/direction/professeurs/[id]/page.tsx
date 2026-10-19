import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StaffDetail, StaffDetailSkeleton } from "@/features/staff/components/staff-detail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("teachers") };
}

async function TeacherDetail({ params }: { params: PageProps<"/[locale]/direction/professeurs/[id]">["params"] }) {
  const { id } = await params;
  return <StaffDetail id={id} kind="teacher" />;
}

export default function TeacherPage({ params }: PageProps<"/[locale]/direction/professeurs/[id]">) {
  return (
    <Suspense fallback={<StaffDetailSkeleton />}>
      <TeacherDetail params={params} />
    </Suspense>
  );
}
