import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronRight, UsersRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { StatusPill } from "@/components/dashboard/status-pill";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PersonAvatar } from "@/components/people/person-avatar";
import { todayInDakar } from "@/features/dashboard/calendar";
import {
  countRecentReports,
  listChildrenAbsences,
  listMyChildren,
  PARENT_WINDOW_DAYS,
  parentWindowStart,
} from "@/features/parent/queries";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("children") };
}

async function Greeting() {
  const { user } = await requireSpace("parent");
  const t = await getTranslations("dashboard");
  const firstName = user.fullName?.split(" ")[0];
  return <p className="text-sm text-muted-foreground">{firstName ? t("welcome", { name: firstName }) : t("welcomeFallback")}</p>;
}

async function Children() {
  const { user } = await requireSpace("parent");
  const today = todayInDakar();
  const from = parentWindowStart(today);
  const children = await listMyChildren(user.id);
  const t = await getTranslations("parentSpace");
  const tHome = await getTranslations("parentHome");
  const tSlots = await getTranslations("attendance.slots");
  if (children.length === 0) return <EmptyState icon={UsersRound} title={tHome("title")} body={tHome("empty")} />;

  const ids = children.map((c) => c.id);
  const [absences, reports] = await Promise.all([listChildrenAbsences(ids, from), countRecentReports(ids, from)]);

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {children.map((child) => {
        const name = `${child.firstName} ${child.lastName}`;
        const list = absences.get(child.id) ?? [];
        const todayMarks = list.filter((a) => a.date === today);
        return (
          <li key={child.id}>
            <Link
              href={`/parent/enfants/${child.id}`}
              className="flex h-full flex-col gap-4 rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <PersonAvatar name={name} />
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold text-ink">{name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[child.className, child.schoolName].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <ChevronRight className="size-5 text-ink-soft" aria-hidden />
              </div>
              {todayMarks.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {todayMarks.map((mark) => (
                    <StatusPill key={mark.slot ?? "jour"} tone={mark.status === "absent" ? "danger" : "warning"}>
                      {t(mark.status === "absent" ? "absentToday" : "lateToday", {
                        slot: mark.slot ? tSlots(mark.slot).toLowerCase() : "",
                      })}
                    </StatusPill>
                  ))}
                </div>
              )}
              <p className="text-sm text-ink-soft">
                {t("summary", {
                  days: PARENT_WINDOW_DAYS,
                  absences: list.filter((a) => a.status === "absent").length,
                  lates: list.filter((a) => a.status === "late").length,
                  reports: reports.get(child.id) ?? 0,
                })}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default async function ParentHomePage() {
  const t = await getTranslations("parentHome");
  return (
    <>
      <PageHeader
        title={t("title")}
        description={
          <Suspense fallback={<span className="inline-block h-4 w-40 animate-pulse rounded-full bg-line" />}>
            <Greeting />
          </Suspense>
        }
      />
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Children />
      </Suspense>
    </>
  );
}
