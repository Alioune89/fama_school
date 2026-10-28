import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { todayInDakar } from "@/features/dashboard/calendar";
import { Agenda } from "@/features/events/components/agenda";
import { EventSheet } from "@/features/events/components/event-sheet";
import { listEvents, listSchoolMilestones } from "@/features/events/queries";
import { agendaRange } from "@/features/events/range";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("calendar") };
}

/** Calendrier de l'école : événements, compositions programmées et périodes, mois par mois. */
async function Calendar() {
  const { entry } = await requireSpace("direction");
  const schoolId = entry.schoolId!;
  const today = todayInDakar();
  const { from, to } = agendaRange(today);
  const canPublish = permissions.publish(entry.roles);
  const [events, milestones, t] = await Promise.all([
    listEvents(from, to, schoolId),
    listSchoolMilestones(schoolId, from, to),
    getTranslations("events"),
  ]);
  return (
    <>
      <PageHeader title={t("pageTitle")} description={t("pageDescription")} actions={canPublish && <EventSheet today={today} />} />
      <Agenda items={[...events, ...milestones]} manage={canPublish} />
    </>
  );
}

export default function DirectionCalendarPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
      <Calendar />
    </Suspense>
  );
}
