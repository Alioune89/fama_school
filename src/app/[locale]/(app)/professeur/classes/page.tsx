import { Suspense } from "react";
import type { Metadata } from "next";
import { ClipboardCheck, LayoutGrid, NotebookPen, PencilLine } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { StatusPill } from "@/components/dashboard/status-pill";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PersonAvatar } from "@/components/people/person-avatar";
import { buttonVariants } from "@/components/ui/button";
import { listTeacherClasses } from "@/features/attendance/queries";
import { todayInDakar } from "@/features/dashboard/calendar";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("myClasses") };
}

/** Classes du professeur : matières, appel du jour, accès rapides et liste des élèves. */
async function Classes() {
  const { user, entry } = await requireSpace("professeur");
  const schoolId = entry.schoolId!;
  const [classes, t, tSex] = await Promise.all([
    listTeacherClasses(schoolId, user.id, todayInDakar()),
    getTranslations("teacherClasses"),
    getTranslations("students.sex"),
  ]);
  if (classes.length === 0) return <EmptyState icon={LayoutGrid} title={t("empty")} body={t("emptyHint")} />;

  const supabase = await createClient();
  const { data: enrollments, error } = await supabase
    .from("enrollments")
    .select("class_id, student:students(id, first_name, last_name, sex, birth_date)")
    .in(
      "class_id",
      classes.map((c) => c.id),
    )
    .eq("status", "active");
  if (error) throw error;
  const roster = new Map<string, NonNullable<(typeof enrollments)[number]["student"]>[]>();
  for (const row of enrollments) {
    if (!row.student) continue;
    roster.set(row.class_id, [...(roster.get(row.class_id) ?? []), row.student]);
  }

  return (
    <div className="space-y-5">
      {classes.map((klass) => {
        const students = (roster.get(klass.id) ?? []).sort(
          (a, b) => a.last_name.localeCompare(b.last_name, "fr") || a.first_name.localeCompare(b.first_name, "fr"),
        );
        const girls = students.filter((s) => s.sex === "F").length;
        const morning = klass.slots.morning;
        return (
          <section
            key={klass.id}
            id={`classe-${klass.id}`}
            aria-labelledby={`title-${klass.id}`}
            className="rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id={`title-${klass.id}`} className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                  {klass.name}
                  {klass.isHomeroom && <StatusPill tone="lavender">{t("homeroom")}</StatusPill>}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {[klass.levelLabel, t("headcount", { count: students.length, girls, boys: students.length - girls })]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <StatusPill tone={morning ? "success" : "warning"}>
                {morning ? t("morningDone", { absent: morning.absent, late: morning.late }) : t("morningPending")}
              </StatusPill>
            </div>

            {klass.subjects.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t("subjects")}>
                {klass.subjects.map((subject) => (
                  <li key={subject} className="rounded-full bg-azure-50 px-2.5 py-1 text-xs font-medium text-ink-soft">
                    {subject}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/professeur/appel/${klass.id}`} className={buttonVariants({ size: "sm" })}>
                <ClipboardCheck aria-hidden />
                {t("rollCall")}
              </Link>
              <Link href="/professeur/notes" className={buttonVariants({ variant: "outline", size: "sm" })}>
                <PencilLine aria-hidden />
                {t("grades")}
              </Link>
              <Link href="/professeur/cahier-de-textes" className={buttonVariants({ variant: "outline", size: "sm" })}>
                <NotebookPen aria-hidden />
                {t("lessonBook")}
              </Link>
            </div>

            <details className="group mt-4 rounded-lg ring-1 ring-line" open={classes.length === 1}>
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold marker:hidden">
                <span className="flex items-center justify-between gap-3">
                  {t("students", { count: students.length })}
                  <span className="text-xl leading-none text-ink-soft transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </span>
              </summary>
              <ul className="grid gap-x-6 border-t border-line px-4 py-2 sm:grid-cols-2">
                {students.map((student) => {
                  const name = `${student.last_name} ${student.first_name}`;
                  return (
                    <li key={student.id} className="flex items-center gap-3 py-2">
                      <PersonAvatar name={name} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {[tSex(student.sex), student.birth_date ? formatDate(student.birth_date) : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </details>
          </section>
        );
      })}
    </div>
  );
}

export default async function TeacherClassesPage() {
  const [t, tNav] = await Promise.all([getTranslations("teacherClasses"), getTranslations("nav")]);
  return (
    <>
      <PageHeader title={tNav("myClasses")} description={t("hint")} />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Classes />
      </Suspense>
    </>
  );
}
