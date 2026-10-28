import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { AnnouncementList } from "@/features/announcements/components/announcement-list";
import { AnnouncementSheet } from "@/features/announcements/components/announcement-sheet";
import { listAnnouncements, listGuardianOptions } from "@/features/announcements/queries";
import { listClasses } from "@/features/classes/queries";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("announcements") };
}

/** Annonces de l'école : rédaction et ciblage (parents, classes, familles en retard, personnel), historique. */
async function Announcements() {
  const { entry } = await requireSpace("direction");
  const schoolId = entry.schoolId!;
  const canPublish = permissions.publish(entry.roles);
  const [announcements, classes, guardians, t] = await Promise.all([
    listAnnouncements(schoolId),
    canPublish ? listClasses(schoolId) : null,
    canPublish ? listGuardianOptions(schoolId) : [],
    getTranslations("announcements"),
  ]);
  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          classes && (
            <AnnouncementSheet
              classes={classes.cycles.flatMap((cycle) => cycle.classes.map((c) => ({ id: c.id, name: c.name })))}
              guardians={guardians}
            />
          )
        }
      />
      <AnnouncementList announcements={announcements} manage={canPublish} />
    </>
  );
}

export default function DirectionAnnouncementsPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
      <Announcements />
    </Suspense>
  );
}
