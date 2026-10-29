"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDate } from "@/lib/format";
import { saveExamCandidates } from "../actions";
import type { ExamCandidateRow } from "../queries";
import { ADMITTED, EXAM_MENTIONS, EXAM_RESULTS, type Exam, type ExamMention, type ExamResult } from "../schemas";

type Entry = { tableNumber: string; center: string; result: ExamResult; mention: ExamMention | null };

const entryOf = (row: ExamCandidateRow): Entry => ({
  tableNumber: row.tableNumber,
  center: row.center,
  result: row.result,
  mention: row.mention,
});

/** Liste des candidats d'un examen : convocation (numéro de table, centre) puis résultat et mention. */
export function ExamBoard({ exam, rows, canEdit }: { exam: Exam; rows: ExamCandidateRow[]; canEdit: boolean }) {
  const t = useTranslations("exams");
  const [saved, setSaved] = useState(() => new Map(rows.map((row) => [row.studentId, entryOf(row)])));
  const [entries, setEntries] = useState(saved);
  const [commonCenter, setCommonCenter] = useState("");
  const changed = rows.filter((row) => JSON.stringify(entries.get(row.studentId)) !== JSON.stringify(saved.get(row.studentId)));
  const form = useActionForm(saveExamCandidates, {
    onSuccess: ({ saved: count }) => {
      setSaved(entries);
      toast.success(t("saved", { count }));
    },
  });

  const update = (studentId: string, patch: Partial<Entry>) =>
    setEntries((current) => {
      const next = new Map(current);
      const entry = { ...next.get(studentId)!, ...patch };
      if (!ADMITTED.includes(entry.result)) entry.mention = null;
      next.set(studentId, entry);
      return next;
    });

  const save = () =>
    form.run({ exam, rows: changed.map((row) => ({ studentId: row.studentId, ...entries.get(row.studentId)! })) });

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex flex-col gap-2 rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70 sm:flex-row sm:items-end">
          <label className="grid flex-1 gap-1.5 text-sm font-medium">
            {t("commonCenter")}
            <Input value={commonCenter} onChange={(event) => setCommonCenter(event.target.value)} maxLength={120} />
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={!commonCenter.trim()}
            onClick={() => {
              for (const row of rows)
                if (!entries.get(row.studentId)!.center) update(row.studentId, { center: commonCenter.trim() });
            }}
          >
            {t("applyCenter")}
          </Button>
        </div>
      )}

      <ul className="grid gap-3">
        {rows.map((row) => {
          const entry = entries.get(row.studentId)!;
          const id = (field: string) => `exam-${row.studentId}-${field}`;
          const name = `${row.lastName} ${row.firstName}`;
          return (
            <li
              key={row.studentId}
              className="grid grid-cols-2 gap-3 rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70 lg:grid-cols-[minmax(0,1.4fr)_7rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)] lg:items-end"
            >
              <div className="col-span-2 min-w-0 lg:col-span-1">
                <p className="truncate font-semibold text-ink">{name}</p>
                <p className="text-xs text-muted-foreground">
                  {[
                    row.className,
                    row.birthDate ? t("bornOn", { date: formatDate(row.birthDate) }) : null,
                    row.average !== null ? t("average", { value: row.average.toLocaleString("fr-FR") }) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <label htmlFor={id("table")} className="grid gap-1 text-xs font-medium text-ink-soft">
                {t("tableNumber")}
                <Input
                  id={id("table")}
                  value={entry.tableNumber}
                  onChange={(event) => update(row.studentId, { tableNumber: event.target.value })}
                  maxLength={20}
                  disabled={!canEdit}
                  aria-label={t("tableNumberFor", { name })}
                  className="tabular-nums"
                />
              </label>
              <label htmlFor={id("center")} className="grid gap-1 text-xs font-medium text-ink-soft">
                {t("center")}
                <Input
                  id={id("center")}
                  value={entry.center}
                  onChange={(event) => update(row.studentId, { center: event.target.value })}
                  maxLength={120}
                  disabled={!canEdit}
                  aria-label={t("centerFor", { name })}
                />
              </label>
              <label htmlFor={id("result")} className="grid gap-1 text-xs font-medium text-ink-soft">
                {t("result")}
                <NativeSelect
                  id={id("result")}
                  value={entry.result}
                  onChange={(event) => update(row.studentId, { result: event.target.value as ExamResult })}
                  disabled={!canEdit}
                  aria-label={t("resultFor", { name })}
                >
                  {EXAM_RESULTS.map((result) => (
                    <option key={result} value={result}>
                      {t(`results.${result}`)}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <label htmlFor={id("mention")} className="grid gap-1 text-xs font-medium text-ink-soft">
                {t("mention")}
                <NativeSelect
                  id={id("mention")}
                  value={entry.mention ?? ""}
                  onChange={(event) => update(row.studentId, { mention: (event.target.value || null) as ExamMention | null })}
                  disabled={!canEdit || !ADMITTED.includes(entry.result)}
                  aria-label={t("mentionFor", { name })}
                >
                  <option value="">—</option>
                  {EXAM_MENTIONS.map((mention) => (
                    <option key={mention} value={mention}>
                      {t(`mentions.${mention}`)}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            </li>
          );
        })}
      </ul>

      {canEdit && (
        <div className="sticky bottom-24 z-10 flex items-center justify-between gap-3 rounded-xl bg-white/95 p-3 shadow-float ring-1 ring-line/70 backdrop-blur lg:bottom-4">
          <p className="text-xs text-ink-soft sm:text-sm">
            {changed.length ? t("pendingChanges", { count: changed.length }) : t("noChanges")}
          </p>
          <FormAlert message={form.formError} />
          <Button type="button" onClick={save} disabled={form.pending || changed.length === 0}>
            <Save aria-hidden />
            {form.pending ? t("saving") : t("save")}
          </Button>
        </div>
      )}
    </div>
  );
}
