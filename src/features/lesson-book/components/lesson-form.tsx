"use client";

import { useState } from "react";
import { NotebookPen } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { addLesson } from "../actions";

/** Séance du jour : ce qui a été fait, chapitre du programme, devoir éventuel (publié aussitôt aux parents). */
export function LessonForm({
  classId,
  subjectId,
  today,
  chapters,
}: {
  classId: string;
  subjectId: string;
  today: string;
  chapters: { id: string; title: string }[];
}) {
  const t = useTranslations("lessonBook");
  const [taughtOn, setTaughtOn] = useState(today);
  const [content, setContent] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [withHomework, setWithHomework] = useState(false);
  const [homework, setHomework] = useState("");
  const [dueOn, setDueOn] = useState("");
  const form = useActionForm(addLesson, {
    onSuccess: () => {
      toast.success(t(withHomework ? "savedWithHomework" : "saved"));
      setContent("");
      setHomework("");
      setDueOn("");
      setWithHomework(false);
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        form.run({
          classId,
          subjectId,
          taughtOn,
          content,
          chapterId: chapterId || null,
          homework: withHomework ? homework : "",
          homeworkDueOn: withHomework && dueOn ? dueOn : null,
        });
      }}
      noValidate
      aria-labelledby="new-lesson"
      className="space-y-4 rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70"
    >
      <h2 id="new-lesson" className="flex items-center gap-2 text-base font-semibold">
        <NotebookPen className="size-4 text-azure-700" aria-hidden />
        {t("newTitle")}
      </h2>
      <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <Field data-invalid={form.hasError("taughtOn") || undefined}>
          <FieldLabel htmlFor="lesson-date">{t("date")}</FieldLabel>
          <Input
            id="lesson-date"
            type="date"
            value={taughtOn}
            max={today}
            onChange={(event) => setTaughtOn(event.target.value)}
          />
          <FieldError>{form.fieldError("taughtOn")}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="lesson-chapter">{t("chapter")}</FieldLabel>
          <NativeSelect id="lesson-chapter" value={chapterId} onChange={(event) => setChapterId(event.target.value)}>
            <option value="">{t(chapters.length ? "noChapter" : "noProgramme")}</option>
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.title}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field data-invalid={form.hasError("content") || undefined}>
        <FieldLabel htmlFor="lesson-content">{t("content")}</FieldLabel>
        <Textarea
          id="lesson-content"
          rows={3}
          maxLength={2000}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={t("contentPlaceholder")}
          aria-invalid={form.hasError("content") || undefined}
        />
        <FieldError>{form.fieldError("content")}</FieldError>
      </Field>
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl px-4 py-3 ring-1 ring-line">
        <span>
          <span className="block text-sm font-semibold text-ink">{t("homeworkToggle")}</span>
          <span className="block text-xs text-muted-foreground">{t("homeworkHint")}</span>
        </span>
        <Switch checked={withHomework} onCheckedChange={setWithHomework} aria-label={t("homeworkToggle")} />
      </label>
      {withHomework && (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <Field data-invalid={form.hasError("homework") || undefined}>
            <FieldLabel htmlFor="lesson-homework">{t("homework")}</FieldLabel>
            <Textarea
              id="lesson-homework"
              rows={2}
              maxLength={1000}
              value={homework}
              onChange={(event) => setHomework(event.target.value)}
              placeholder={t("homeworkPlaceholder")}
            />
            <FieldError>{form.fieldError("homework")}</FieldError>
          </Field>
          <Field data-invalid={form.hasError("homeworkDueOn") || undefined}>
            <FieldLabel htmlFor="lesson-due">{t("dueOn")}</FieldLabel>
            <Input id="lesson-due" type="date" min={taughtOn} value={dueOn} onChange={(event) => setDueOn(event.target.value)} />
            <FieldError>{form.fieldError("homeworkDueOn")}</FieldError>
          </Field>
        </div>
      )}
      <FormAlert message={form.formError} />
      <Button type="submit" disabled={form.pending}>
        {t("save")}
      </Button>
    </form>
  );
}
