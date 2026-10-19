import { Suspense } from "react";
import type { Metadata } from "next";
import { LayoutGrid } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("home") };
}

async function Greeting() {
  const { user, entry } = await requireSpace("professeur");
  const t = await getTranslations("dashboard");
  const firstName = user.fullName?.split(" ")[0];
  return (
    <p className="text-sm text-muted-foreground">
      {firstName ? t("welcome", { name: firstName }) : t("welcomeFallback")} · {entry.schoolName}
    </p>
  );
}

export default async function TeacherHomePage() {
  const t = await getTranslations("teacherHome");
  return (
    <>
      <PageHeader
        title={t("title")}
        description={
          <Suspense fallback={<span className="inline-block h-4 w-48 animate-pulse rounded-full bg-line" />}>
            <Greeting />
          </Suspense>
        }
      />
      <EmptyState icon={LayoutGrid} title={t("title")} body={t("empty")} />
    </>
  );
}
