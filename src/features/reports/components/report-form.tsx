"use client";

import { useState } from "react";
import { BookX, Backpack, CircleCheck, HeartPulse, MessageSquareWarning, TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOffline } from "next/offline";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { TeacherRoster } from "@/features/attendance/queries";
import { REPORT_CATEGORIES, studentReportPayloadSchema, type ReportCategory } from "@/lib/offline/operations";
import { enqueue } from "@/lib/offline/outbox";
import { cn } from "@/lib/utils";

const ICONS: Record<ReportCategory, LucideIcon> = {
  behavior: TriangleAlert,
  health: HeartPulse,
  homework: BookX,
  equipment: Backpack,
  other: MessageSquareWarning,
};

const MAX_LENGTH = 1000;

/**
 * Signalement d'un élève par l'enseignant : classe, élève, type et motif.
 * Gardé sur le téléphone puis envoyé (hors ligne compris) ; le parent le voit dans son espace.
 */
export function ReportForm({
  userId,
  rosters,
  defaultClassId,
}: {
  userId: string;
  rosters: TeacherRoster[];
  defaultClassId?: string;
}) {
  const t = useTranslations("reports.form");
  const tCategories = useTranslations("reports.categories");
  const tValidation = useTranslations();
  const isOffline = useOffline();

  const [classId, setClassId] = useState(rosters.find((r) => r.id === defaultClassId)?.id ?? rosters[0]?.id ?? "");
  const [studentId, setStudentId] = useState("");
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<{ name: string; offline: boolean } | null>(null);
  const [pending, setPending] = useState(false);

  const roster = rosters.find((r) => r.id === classId);
  const student = roster?.students.find((s) => s.id === studentId);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const fieldErrors: Record<string, string> = {};
    if (!student) fieldErrors.studentId = "reports.form.chooseStudent";
    if (!category) fieldErrors.category = "reports.form.chooseCategory";
    const payload = {
      studentId,
      classId,
      category: category ?? "other",
      message,
      occurredAt: new Date().toISOString(),
    };
    const parsed = studentReportPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (key === "message" && !fieldErrors.message) fieldErrors.message = issue.message;
      }
    }
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0 || !parsed.success || !student || !category) return;

    setPending(true);
    try {
      const name = `${student.firstName} ${student.lastName}`;
      await enqueue(
        userId,
        { id: crypto.randomUUID(), kind: "student.report", payload: parsed.data },
        { ref: `report:${crypto.randomUUID()}`, label: t("opLabel", { name, category: tCategories(category) }) },
      );
      setSaved({ name, offline: isOffline });
      setStudentId("");
      setCategory(null);
      setMessage("");
    } finally {
      setPending(false);
    }
  }

  const error = (key: string) => (errors[key] ? tValidation(errors[key] as Parameters<typeof tValidation>[0]) : null);

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {saved && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl bg-success-50 px-4 py-3 text-sm font-medium text-success-700"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          {saved.offline ? t("savedOffline", { name: saved.name }) : t("saved", { name: saved.name })}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="report-class">{t("class")}</FieldLabel>
          <NativeSelect
            id="report-class"
            value={classId}
            onChange={(event) => {
              setClassId(event.target.value);
              setStudentId("");
            }}
          >
            {rosters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field data-invalid={errors.studentId ? true : undefined}>
          <FieldLabel htmlFor="report-student">{t("student")}</FieldLabel>
          <NativeSelect
            id="report-student"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            aria-invalid={errors.studentId ? true : undefined}
          >
            <option value="">{t("chooseStudentOption")}</option>
            {roster?.students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.lastName} {s.firstName}
              </option>
            ))}
          </NativeSelect>
          <FieldError>{error("studentId")}</FieldError>
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("category")}</legend>
        <div role="radiogroup" aria-label={t("category")} className="flex flex-wrap gap-2">
          {REPORT_CATEGORIES.map((value) => {
            const Icon = ICONS[value];
            const selected = category === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setCategory(value)}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 transition-colors",
                  selected ? "bg-azure-100 text-ink ring-azure-500" : "bg-white text-ink-soft ring-line hover:text-ink",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {tCategories(value)}
              </button>
            );
          })}
        </div>
        {errors.category && <p className="mt-2 text-sm text-destructive">{error("category")}</p>}
      </fieldset>

      <Field data-invalid={errors.message ? true : undefined}>
        <FieldLabel htmlFor="report-message">{t("message")}</FieldLabel>
        <Textarea
          id="report-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={MAX_LENGTH}
          rows={4}
          placeholder={t("messagePlaceholder")}
          aria-invalid={errors.message ? true : undefined}
        />
        <FieldDescription>
          {t("messageHint")} · {message.length}/{MAX_LENGTH}
        </FieldDescription>
        <FieldError>{error("message")}</FieldError>
      </Field>

      <Button type="submit" size="touch" disabled={pending} className="w-full sm:w-auto">
        {t("submit")}
      </Button>
    </form>
  );
}
