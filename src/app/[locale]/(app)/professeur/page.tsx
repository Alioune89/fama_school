import { Suspense } from "react";
import type { Metadata } from "next";
import { BookOpenCheck, ChevronRight, LayoutGrid, MessagesSquare, PencilLine } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { KpiCard, KpiCardSkeleton } from "@/components/dashboard/kpi-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { TeacherClassList } from "@/features/attendance/components/teacher-class-list";
import { listTeacherClasses } from "@/features/attendance/queries";
import { todayInDakar } from "@/features/dashboard/calendar";
import { listConversations } from "@/features/messaging/queries";
import { getTeacherEvaluations, type TeacherEvaluation } from "@/features/teacher-home/queries";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

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

const card = "rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70";

async function EvaluationList({
  items,
  emptyLabel,
  upcoming,
}: {
  items: TeacherEvaluation[];
  emptyLabel: string;
  upcoming?: boolean;
}) {
  const [t, tKinds] = await Promise.all([getTranslations("teacherHome"), getTranslations("evaluations.kinds")]);
  if (items.length === 0) return <p className="mt-2 text-sm text-muted-foreground">{emptyLabel}</p>;
  return (
    <ul className="mt-2 divide-y divide-line">
      {items.slice(0, 6).map((item) => (
        <li key={item.id}>
          <Link
            href={`/professeur/notes/${item.id}`}
            className="flex items-center gap-3 py-2.5 text-sm hover:text-azure-700"
            aria-label={t(upcoming ? "openUpcoming" : "openToFinish", { title: item.title, className: item.className })}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{item.title}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {[
                  item.className,
                  item.subjectName,
                  tKinds(item.kind),
                  formatDate(item.heldOn, { weekday: "short", day: "numeric", month: "short" }),
                ].join(" · ")}
              </span>
            </span>
            {!upcoming &&
              (item.graded < item.students ? (
                <StatusPill tone="warning">{t("graded", { graded: item.graded, total: item.students })}</StatusPill>
              ) : (
                <StatusPill tone="info">{t("toPublish")}</StatusPill>
              ))}
            <ChevronRight className="size-4 shrink-0 text-ink-soft" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Tableau de bord du professeur : chiffres du jour, classes et appels, notes à finir, évaluations à venir, messages. */
async function Dashboard() {
  const { user, entry } = await requireSpace("professeur");
  const schoolId = entry.schoolId!;
  const today = todayInDakar();
  const [classes, evaluations, conversations, t] = await Promise.all([
    listTeacherClasses(schoolId, user.id, today),
    getTeacherEvaluations(schoolId, user.id, today),
    listConversations("teacher", user.id),
    getTranslations("teacherHome"),
  ]);
  if (classes.length === 0) return <EmptyState icon={LayoutGrid} title={t("title")} body={t("empty")} />;

  const students = classes.reduce((sum, c) => sum + c.studentCount, 0);
  const rollCalls = classes.filter((c) => c.slots.morning).length;
  const unread = conversations.filter((c) => c.unread).length;

  return (
    <div className="space-y-6">
      <section aria-label={t("figures")} className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard tone="azure" label={t("kpis.classes")} value={classes.length} href="/professeur/classes" />
        <KpiCard tone="lavender" label={t("kpis.students")} value={students} href="/professeur/classes" />
        <KpiCard tone="white" label={t("kpis.rollCalls")} value={`${rollCalls}/${classes.length}`} href="/professeur/appel" />
        <KpiCard tone="sun" label={t("kpis.unread")} value={unread} href="/professeur/messages" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section aria-labelledby="today-classes">
          <h2 id="today-classes" className="mb-3 text-lg font-semibold">
            {t("classesTitle")}
          </h2>
          <TeacherClassList userId={user.id} date={today} classes={classes} />
        </section>

        <div className="space-y-6">
          <section aria-labelledby="to-finish" className={card}>
            <h2 id="to-finish" className="flex items-center gap-2 text-base font-semibold">
              <PencilLine className="size-4 text-azure-700" aria-hidden />
              {t("toFinishTitle")}
            </h2>
            <EvaluationList items={evaluations.toFinish} emptyLabel={t("toFinishEmpty")} />
          </section>
          <section aria-labelledby="upcoming" className={card}>
            <h2 id="upcoming" className="flex items-center gap-2 text-base font-semibold">
              <BookOpenCheck className="size-4 text-azure-700" aria-hidden />
              {t("upcomingTitle")}
            </h2>
            <EvaluationList items={evaluations.upcoming} emptyLabel={t("upcomingEmpty")} upcoming />
          </section>
          <Link href="/professeur/messages" className={`${card} flex items-center gap-3 hover:ring-azure-300`}>
            <MessagesSquare className="size-5 shrink-0 text-azure-700" aria-hidden />
            <span className="min-w-0 flex-1 text-sm font-medium text-ink">
              {unread > 0 ? t("messagesUnread", { count: unread }) : t("messagesNone")}
            </span>
            <ChevronRight className="size-4 text-ink-soft" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
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
      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiCardSkeleton tone="azure" />
            <KpiCardSkeleton tone="lavender" />
            <KpiCardSkeleton tone="white" />
            <KpiCardSkeleton tone="sun" />
          </div>
        }
      >
        <Dashboard />
      </Suspense>
    </>
  );
}
