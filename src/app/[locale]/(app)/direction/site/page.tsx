import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { SiteEditor } from "@/features/school-site/components/site-editor";
import { getSiteEditorData } from "@/features/school-site/queries";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("schoolSite") };
}

async function Editor() {
  const { entry } = await requireSpace("direction");
  const data = await getSiteEditorData(entry.schoolId!);
  return <SiteEditor data={data} schoolId={entry.schoolId!} canEdit={permissions.publish(entry.roles)} />;
}

/** Site vitrine de l'école : rédaction, photos, mise en ligne sur /ecoles/<école>. */
export default async function SchoolSitePage() {
  const t = await getTranslations("schoolSite");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Editor />
      </Suspense>
    </>
  );
}
