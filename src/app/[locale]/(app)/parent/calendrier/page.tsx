import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { todayInDakar } from "@/features/dashboard/calendar";
import { Agenda } from "@/features/events/components/agenda";
import { listEvents } from "@/features/events/queries";
import { agendaRange } from "@/features/events/range";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("calendar") };
}

/** Calendrier de l'école (de toutes les écoles des enfants pour un parent) : vacances, examens, réunions, fêtes. */
async function Calendar() {
  await requireSpace("parent");
  const { from, to } = agendaRange(todayInDakar());
  return <Agenda items={await listEvents(from, to)} />;
}

export default async function ParentCalendarPage() {
  const t = await getTranslations("events");
  return (
    <>
      <PageHeader title={t("pageTitle")} description={t("readDescription")} />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Calendar />
      </Suspense>
    </>
  );
}
