import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isValidDay, shiftDay } from "@/features/attendance/report";
import { todayInDakar } from "@/features/dashboard/calendar";
import { JustificationForm } from "@/features/justifications/components/justification-form";
import { JUSTIFICATION_FUTURE_DAYS, JUSTIFICATION_PAST_DAYS } from "@/features/justifications/schemas";
import { listMyChildren } from "@/features/parent/queries";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("justifications");
  return { title: t("title") };
}

type Props = PageProps<"/[locale]/parent/enfants/[id]/justifier">;

/** Justifier une absence : le jour vient du lien « Justifier » de la liste des absences (?du=AAAA-MM-JJ). */
async function Justify({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const [{ id }, query, { user }] = await Promise.all([params, searchParams, requireSpace("parent")]);
  const child = (await listMyChildren(user.id)).find((c) => c.id === id);
  if (!child) notFound();

  const t = await getTranslations("justifications");
  const today = todayInDakar();
  const minDate = shiftDay(today, -JUSTIFICATION_PAST_DAYS);
  const maxDate = shiftDay(today, JUSTIFICATION_FUTURE_DAYS);
  const requested = typeof query.du === "string" && isValidDay(query.du) ? query.du : today;
  const defaultDate = requested < minDate || requested > maxDate ? today : requested;

  return (
    <>
      <Link
        href={`/parent/enfants/${child.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {child.firstName} {child.lastName}
      </Link>
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        {child.firstName} {child.lastName}
        {child.className && ` · ${child.className}`} — {t("hint")}
      </p>
      <section className="rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6">
        <JustificationForm
          studentId={child.id}
          schoolId={child.schoolId}
          defaultDate={defaultDate}
          today={today}
          minDate={minDate}
          maxDate={maxDate}
        />
      </section>
    </>
  );
}

export default function JustifyAbsencePage({ params, searchParams }: Props) {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Justify params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
