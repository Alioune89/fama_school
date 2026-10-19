import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StudentDetailSkeleton, StudentDetailView } from "@/features/students/components/student-detail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("students") };
}

async function StudentDetail({ params }: { params: PageProps<"/[locale]/direction/eleves/[id]">["params"] }) {
  const { id } = await params;
  return <StudentDetailView id={id} />;
}

export default function StudentPage({ params }: PageProps<"/[locale]/direction/eleves/[id]">) {
  return (
    <Suspense fallback={<StudentDetailSkeleton />}>
      <StudentDetail params={params} />
    </Suspense>
  );
}
