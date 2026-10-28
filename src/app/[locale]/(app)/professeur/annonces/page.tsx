import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { AnnouncementList } from "@/features/announcements/components/announcement-list";
import { listAnnouncements } from "@/features/announcements/queries";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("announcements") };
}

/** Annonces reçues de l'école (la RLS ne renvoie que celles adressées au compte connecté). */
async function Announcements() {
  await requireSpace("professeur");
  return <AnnouncementList announcements={await listAnnouncements()} />;
}

export default async function TeacherAnnouncementsPage() {
  const t = await getTranslations("announcements");
  return (
    <>
      <PageHeader title={t("title")} description={t("received")} />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Announcements />
      </Suspense>
    </>
  );
}
