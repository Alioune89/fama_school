import { BookOpen, ClipboardList } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { formatDate } from "@/lib/format";
import type { Lesson } from "../queries";
import { DeleteLessonButton } from "./delete-lesson-button";

/** Séances du cahier de textes : date, matière, chapitre, contenu, devoir à rendre. */
export async function LessonList({
  lessons,
  showSubject = false,
  showClass = false,
  canDelete = false,
  compactEmpty = false,
}: {
  lessons: Lesson[];
  showSubject?: boolean;
  showClass?: boolean;
  canDelete?: boolean;
  /** Liste vide en une ligne (plusieurs listes sur la page). */
  compactEmpty?: boolean;
}) {
  const t = await getTranslations("lessonBook");
  if (lessons.length === 0) {
    return compactEmpty ? (
      <p className="text-sm text-muted-foreground">{t("empty")}</p>
    ) : (
      <EmptyState icon={BookOpen} title={t("empty")} body={t("emptyHint")} />
    );
  }
  return (
    <ol className="space-y-3" aria-label={t("listLabel")}>
      {lessons.map((lesson) => {
        const date = formatDate(lesson.taughtOn, { weekday: "long", day: "numeric", month: "long" });
        return (
          <li key={lesson.id} className="rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink-soft first-letter:uppercase">
                  {[date, showClass ? lesson.className : null, showSubject ? lesson.subjectName : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {lesson.chapterTitle && (
                  <p className="mt-0.5 text-xs text-azure-700">{t("chapterLine", { title: lesson.chapterTitle })}</p>
                )}
                <p className="mt-1.5 text-sm whitespace-pre-line text-ink">{lesson.content}</p>
              </div>
              {canDelete && <DeleteLessonButton id={lesson.id} date={date} />}
            </div>
            {lesson.homework && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-sun-100 px-3 py-2 text-sm">
                <ClipboardList className="mt-0.5 size-4 shrink-0 text-sun-700" aria-hidden />
                <p className="min-w-0">
                  <span className="font-semibold">
                    {t("homeworkDue", {
                      date: formatDate(lesson.homeworkDueOn!, { weekday: "long", day: "numeric", month: "long" }),
                    })}
                  </span>{" "}
                  <span className="whitespace-pre-line">{lesson.homework}</span>
                </p>
              </div>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">{t("by", { name: lesson.authorName })}</p>
          </li>
        );
      })}
    </ol>
  );
}
