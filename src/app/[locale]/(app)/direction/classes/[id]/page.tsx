import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ClassDetailSkeleton, ClassDetailView } from "@/features/classes/components/class-detail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("classes") };
}

async function ClassDetail({ params }: { params: PageProps<"/[locale]/direction/classes/[id]">["params"] }) {
  const { id } = await params;
  return <ClassDetailView id={id} />;
}

export default function ClassPage({ params }: PageProps<"/[locale]/direction/classes/[id]">) {
  return (
    <Suspense fallback={<ClassDetailSkeleton />}>
      <ClassDetail params={params} />
    </Suspense>
  );
}
