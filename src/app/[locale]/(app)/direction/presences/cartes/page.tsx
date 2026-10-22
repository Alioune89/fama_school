import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronLeft, IdCard } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { FilterSelect } from "@/components/data/filter-select";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { BadgeCards } from "@/features/arrivals/components/badge-cards";
import { PrintButton } from "@/features/arrivals/components/print-button";
import { listBadges } from "@/features/arrivals/queries";
import { listAttendanceClasses } from "@/features/attendance/direction-queries";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("arrivals.cardsPage");
  return { title: t("title") };
}

type SearchParams = PageProps<"/[locale]/direction/presences/cartes">["searchParams"];

/** Cartes d'une classe (?classe=), d'un élève (?eleve=) ou de toute l'école. */
async function Cards({ searchParams }: { searchParams: SearchParams }) {
  const [params, { entry }] = await Promise.all([searchParams, requireSpace("direction")]);
  const schoolId = entry.schoolId!;
  const supabase = await createClient();
  const [classes, t, schoolResult, yearResult] = await Promise.all([
    listAttendanceClasses(schoolId),
    getTranslations("arrivals.cardsPage"),
    supabase.from("schools").select("name, logo_path").eq("id", schoolId).maybeSingle(),
    supabase.from("academic_years").select("label").eq("school_id", schoolId).eq("is_current", true).maybeSingle(),
  ]);
  const classId = classes.find((c) => c.id === params.classe)?.id;
  const studentId = typeof params.eleve === "string" ? params.eleve : null;
  const badges = (await listBadges(schoolId, classId)).filter((b) => !studentId || b.studentId === studentId);
  const school = schoolResult.data;

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        {studentId ? (
          <span />
        ) : (
          <FilterSelect
            param="classe"
            label={t("classFilter")}
            allLabel={t("allClasses")}
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
          />
        )}
        {badges.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-soft">{t("count", { count: badges.length })}</span>
            <PrintButton />
          </div>
        )}
      </div>
      {badges.length === 0 ? (
        <EmptyState icon={IdCard} title={t("empty")} body={t("emptyHint")} />
      ) : (
        <BadgeCards
          badges={badges}
          school={{
            name: school?.name ?? entry.schoolName ?? "",
            logoUrl: school?.logo_path
              ? supabase.storage.from("school-logos").getPublicUrl(school.logo_path).data.publicUrl
              : null,
            yearLabel: yearResult.data?.label ?? null,
          }}
        />
      )}
    </>
  );
}

export default async function BadgeCardsPage({ searchParams }: PageProps<"/[locale]/direction/presences/cartes">) {
  const t = await getTranslations("arrivals.cardsPage");
  const tArrivals = await getTranslations("arrivals");
  return (
    <>
      <div className="print:hidden">
        <Link
          href="/direction/presences/pointage"
          className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {tArrivals("title")}
        </Link>
        <PageHeader title={t("title")} description={t("hint")} />
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Cards searchParams={searchParams} />
      </Suspense>
    </>
  );
}
