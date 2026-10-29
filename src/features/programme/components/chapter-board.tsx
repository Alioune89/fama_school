"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, Check, Pencil, Trash2, Undo2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useMessage } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChapterStatus } from "@/lib/domain/programme";
import { cn } from "@/lib/utils";
import { deleteChapter, setChapterProgress, updateChapter, validateChapter } from "../actions";
import type { Chapter } from "../queries";

const monthLabel = (month: string) =>
  new Date(`${month}T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", timeZone: "UTC" });

/**
 * Chapitres d'un programme pour une classe : statut (à faire, en cours, terminé, validé), modifié par le
 * professeur ; validation par la direction ; rédaction du programme (titre, séances, mois visé).
 */
export function ChapterBoard({
  classId,
  chapters,
  statuses,
  months,
  canProgress,
  canEdit,
  canValidate,
}: {
  classId: string;
  chapters: Chapter[];
  statuses: Record<string, ChapterStatus>;
  months: string[];
  canProgress: boolean;
  canEdit: boolean;
  canValidate: boolean;
}) {
  const t = useTranslations("programme");
  const message = useMessage();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", sessions: 1, targetMonth: "" });

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success?: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(message(result.error));
      else if (success) toast.success(success);
    });
  }

  const STATUS_OPTIONS = [
    { value: null, label: t("status.todo") },
    { value: "in_progress", label: t("status.in_progress") },
    { value: "done", label: t("status.done") },
  ] as const;

  return (
    <ol className="space-y-2" aria-label={t("chaptersLabel")}>
      {chapters.map((chapter, index) => {
        const status = statuses[chapter.id] ?? "todo";
        if (editing === chapter.id) {
          return (
            <li key={chapter.id} className="space-y-3 rounded-xl bg-white p-4 ring-2 ring-azure-500">
              <Input
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                aria-label={t("chapterTitle")}
                maxLength={160}
              />
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  {t("sessions")}
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={draft.sessions}
                    onChange={(event) => setDraft({ ...draft, sessions: Number(event.target.value) })}
                    className="w-20"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  {t("targetMonth")}
                  <select
                    value={draft.targetMonth}
                    onChange={(event) => setDraft({ ...draft, targetMonth: event.target.value })}
                    className="h-9 rounded-lg px-2 ring-1 ring-line"
                  >
                    <option value="">{t("noTarget")}</option>
                    {months.map((month) => (
                      <option key={month} value={month}>
                        {monthLabel(`${month}-01`)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        const result = await updateChapter({
                          id: chapter.id,
                          title: draft.title,
                          sessions: draft.sessions,
                          targetMonth: draft.targetMonth || null,
                        });
                        if (result.ok) setEditing(null);
                        return result;
                      })
                    }
                  >
                    <Check aria-hidden />
                    {t("save")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    <X aria-hidden />
                    {t("cancel")}
                  </Button>
                </div>
              </div>
            </li>
          );
        }
        return (
          <li
            key={chapter.id}
            className={cn(
              "flex flex-col gap-3 rounded-xl bg-white p-4 ring-1 sm:flex-row sm:items-center",
              status === "validated" ? "ring-success-500/40" : status === "done" ? "ring-azure-500/50" : "ring-line",
            )}
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold text-ink-soft">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-ink">{chapter.title}</p>
                <p className="text-xs text-muted-foreground">
                  {[
                    t("sessionsCount", { count: chapter.sessions }),
                    chapter.targetMonth ? t("target", { month: monthLabel(chapter.targetMonth) }) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {status === "validated" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-3 py-1 text-sm font-semibold text-success-700">
                  <BadgeCheck className="size-4" aria-hidden />
                  {t("status.validated")}
                </span>
              ) : canProgress ? (
                <div
                  role="radiogroup"
                  aria-label={t("statusFor", { title: chapter.title })}
                  className="flex rounded-full bg-muted p-0.5"
                >
                  {STATUS_OPTIONS.map((option) => {
                    const active = (option.value ?? "todo") === status;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={pending}
                        onClick={() =>
                          !active && run(() => setChapterProgress({ classId, chapterId: chapter.id, status: option.value }))
                        }
                        className={cn(
                          "h-8 rounded-full px-3 text-xs font-semibold",
                          active ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink",
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-ink-soft">
                  {t(`status.${status}`)}
                </span>
              )}
              {canValidate && status === "done" && (
                <>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => validateChapter({ classId, chapterId: chapter.id, approve: true }), t("validated"))}
                    aria-label={t("validateFor", { title: chapter.title })}
                  >
                    <BadgeCheck aria-hidden />
                    {t("validate")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => run(() => validateChapter({ classId, chapterId: chapter.id, approve: false }))}
                    aria-label={t("sendBackFor", { title: chapter.title })}
                  >
                    <Undo2 aria-hidden />
                    {t("sendBack")}
                  </Button>
                </>
              )}
              {canEdit && (
                <>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t("editFor", { title: chapter.title })}
                    onClick={() => {
                      setDraft({
                        title: chapter.title,
                        sessions: chapter.sessions,
                        targetMonth: chapter.targetMonth?.slice(0, 7) ?? "",
                      });
                      setEditing(chapter.id);
                    }}
                  >
                    <Pencil aria-hidden />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t("deleteFor", { title: chapter.title })}
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(t("deleteConfirm", { title: chapter.title })))
                        run(() => deleteChapter({ id: chapter.id }));
                    }}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
