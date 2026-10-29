import { Suspense } from "react";
import type { Metadata } from "next";
import { ClipboardList, UsersRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { todayInDakar } from "@/features/dashboard/calendar";
import { LessonList } from "@/features/lesson-book/components/lesson-list";
import { listHomework, listLessons } from "@/features/lesson-book/queries";
import { listMyChildren } from "@/features/parent/queries";
import { currentClassOf } from "@/features/programme/queries";
import { requireSpace } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("homework") };
}

/** Devoirs à faire de chaque enfant, par date de remise, puis les dernières séances de sa classe. */
async function Homework() {
  const { user } = await requireSpace("parent");
  const [children, t] = await Promise.all([listMyChildren(user.id), getTranslations("lessonBook")]);
  if (children.length === 0) return <EmptyState icon={UsersRound} title={t("parentTitle")} body={t("noChildren")} />;
  const today = todayInDakar();
  const withClasses = await Promise.all(children.map(async (child) => ({ child, classId: await currentClassOf(child.id) })));

  return (
    <div className="space-y-8">
      {await Promise.all(
        withClasses.map(async ({ child, classId }) => {
          const [homework, recent] = classId
            ? await Promise.all([listHomework([classId], today), listLessons(classId, undefined, 10)])
            : [[], []];
          return (
            <section key={child.id} aria-labelledby={`homework-${child.id}`} className="space-y-3">
              <h2 id={`homework-${child.id}`} className="text-lg font-semibold">
                {t("childHeading", { name: child.firstName, className: child.className ?? "" })}
              </h2>
              <div className="rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <ClipboardList className="size-4 text-sun-700" aria-hidden />
                  {t("toDo")}
                </h3>
                {homework.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">{t("noHomework", { name: child.firstName })}</p>
                ) : (
                  <ul className="mt-2 divide-y divide-line" aria-label={t("toDoFor", { name: child.firstName })}>
                    {homework.map((item) => (
                      <li key={item.id} className="py-2.5 text-sm">
                        <p className="font-semibold text-ink">
                          {t("dueLine", {
                            date: formatDate(item.homeworkDueOn!, { weekday: "long", day: "numeric", month: "long" }),
                            subject: item.subjectName,
                          })}
                        </p>
                        <p className="whitespace-pre-line text-ink-soft">{item.homework}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <h3 className="pt-1 text-sm font-semibold text-ink-soft">{t("recentTitle")}</h3>
              <LessonList lessons={recent} showSubject compactEmpty />
            </section>
          );
        }),
      )}
    </div>
  );
}

export default async function ParentHomeworkPage() {
  const t = await getTranslations("lessonBook");
  return (
    <>
      <PageHeader title={t("parentTitle")} description={t("parentDescription")} />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Homework />
      </Suspense>
    </>
  );
}
