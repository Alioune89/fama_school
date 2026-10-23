"use client";

import { useState, useTransition } from "react";
import { Lock, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOffline } from "next/offline";
import { toast } from "sonner";
import { useMessage } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { appreciation, type Rank } from "@/lib/domain/grading";
import { cn } from "@/lib/utils";
import { saveAppreciations } from "../actions";
import type { AverageRow, SubjectAverages } from "../queries";
import { formatAverage, formatScore } from "../sheet";

const SCALE_MAX = { ten: 10, twenty: 20 } as const;
const SUGGESTION_VARIANTS = ["a", "b"] as const;

/** Clé des phrases proposées : niveau de la moyenne, ou niveau d'acquisition au préscolaire. */
function suggestionKey(row: AverageRow, scale: SubjectAverages["scale"]) {
  if (scale === "appreciation") return row.summary;
  return appreciation(row.average, scale);
}

/**
 * Moyennes d'une classe dans une matière : rang, notes de chaque évaluation et appréciation de l'enseignant.
 * Une phrase est proposée selon la moyenne ; l'enseignant la choisit, la modifie ou écrit la sienne.
 */
export function SubjectAveragesBoard({ data, editable }: { data: SubjectAverages; editable: boolean }) {
  const t = useTranslations("grades");
  const tAverages = useTranslations("grades.averages");
  const message = useMessage();
  const isOffline = useOffline();
  const [pending, startTransition] = useTransition();
  const canEdit = editable && !data.locked;
  const max = data.scale === "appreciation" ? null : SCALE_MAX[data.scale];

  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(data.rows.map((row) => [row.id, row.appreciation])),
  );
  const changed = data.rows.filter((row) => (texts[row.id] ?? "").trim() !== row.appreciation);
  const suggest = (row: AverageRow) => {
    const key = suggestionKey(row, data.scale);
    return key ? SUGGESTION_VARIANTS.map((variant) => tAverages(`suggestions.${key}.${variant}`)) : [];
  };
  const emptyWithSuggestion = data.rows.filter((row) => !(texts[row.id] ?? "").trim() && suggest(row).length > 0);

  const markLabel = (mark: NonNullable<AverageRow["marks"][number]>) => {
    if ("score" in mark) return formatScore(mark.score);
    if ("acquisition" in mark) return t(`levels.${mark.acquisition}`);
    return t(mark.status === "absent" ? "absentShort" : "excusedShort");
  };

  const rankLabel = (rank: Rank) => tAverages(rank.exAequo ? "rankExAequo" : "rank", { rank: rank.rank });

  function fillEmpty() {
    setTexts((current) => {
      const next = { ...current };
      for (const row of emptyWithSuggestion) next[row.id] = suggest(row)[0]!;
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const result = await saveAppreciations({
        classId: data.classId,
        subjectId: data.subjectId,
        periodId: data.periodId,
        items: Object.fromEntries(changed.map((row) => [row.id, (texts[row.id] ?? "").trim()])),
      });
      if (result.ok) toast.success(tAverages("saved"));
      else toast.error(message(result.error));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-lg font-bold text-ink">
            {data.className} · {data.subjectName}
            {max !== null && (
              <span className="ml-2 text-sm font-medium text-muted-foreground">
                {tAverages("coefficient", { value: data.coefficient })}
              </span>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {data.periodLabel} · {tAverages("evaluationCount", { count: data.evaluations.length })}
          </p>
          {max !== null && (
            <p className="text-xs text-muted-foreground">
              {tAverages("formula", {
                devoir: data.weights.devoir,
                interrogation: data.weights.interrogation,
                composition: data.weights.composition,
              })}
            </p>
          )}
        </div>
        {data.stats && max !== null && (
          <dl className="tabular grid shrink-0 grid-cols-3 gap-4 text-center">
            {(
              [
                ["classAverage", data.stats.average],
                ["highest", data.stats.highest],
                ["lowest", data.stats.lowest],
              ] as const
            ).map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs text-muted-foreground">{tAverages(key)}</dt>
                <dd className="text-lg font-bold text-ink">
                  {formatAverage(value)}
                  <span className="text-xs font-normal text-muted-foreground">/{max}</span>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {data.locked ? (
        <p className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-ink-soft">
          <Lock className="size-4 shrink-0" aria-hidden />
          {t("locked", { label: data.periodLabel })}
        </p>
      ) : canEdit ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{tAverages("hint")}</p>
          {emptyWithSuggestion.length > 0 && (
            <Button variant="outline" size="sm" onClick={fillEmpty}>
              <Sparkles aria-hidden />
              {tAverages("fillEmpty", { count: emptyWithSuggestion.length })}
            </Button>
          )}
        </div>
      ) : null}

      {data.rows.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-muted-foreground shadow-card">{t("emptyRoster")}</p>
      ) : (
        <ol className="grid max-w-4xl gap-2" aria-label={tAverages("listLabel")}>
          {data.rows.map((row) => {
            const name = `${row.firstName} ${row.lastName}`;
            const text = texts[row.id] ?? "";
            const suggestions = canEdit ? suggest(row).filter((phrase) => phrase !== text.trim()) : [];
            return (
              <li key={row.id} className="rounded-xl bg-white p-3 shadow-card ring-1 ring-line/70 sm:p-4">
                <div className="flex items-start gap-3">
                  <span className="min-w-0 flex-1 truncate text-ink">
                    <span className="font-semibold">{row.lastName}</span> {row.firstName}
                  </span>
                  <span className="tabular shrink-0 text-right">
                    {max !== null ? (
                      row.average !== null ? (
                        <>
                          <span className="text-base font-bold text-ink">{formatAverage(row.average)}</span>
                          <span className="text-xs text-muted-foreground">/{max}</span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">{tAverages("noAverage")}</span>
                      )
                    ) : (
                      <span className="text-sm font-semibold text-ink">
                        {row.summary ? t(`levels.${row.summary}`) : tAverages("noAverage")}
                      </span>
                    )}
                    {row.rank && <span className="block text-xs font-semibold text-ink-soft">{rankLabel(row.rank)}</span>}
                  </span>
                </div>
                {data.evaluations.length > 0 && (
                  <p className="tabular mt-1 text-xs text-muted-foreground">
                    {data.evaluations
                      .map((evaluation, index) => {
                        const mark = row.marks[index];
                        const value = !mark ? "—" : markLabel(mark);
                        return `${evaluation.title} : ${value}`;
                      })
                      .join(" · ")}
                  </p>
                )}
                <div className="mt-2 space-y-1.5">
                  <Textarea
                    rows={1}
                    maxLength={300}
                    aria-label={tAverages("appreciationLabel", { name })}
                    placeholder={canEdit ? tAverages("appreciationPlaceholder") : tAverages("noAppreciation")}
                    disabled={!canEdit}
                    value={text}
                    onChange={(event) => setTexts((current) => ({ ...current, [row.id]: event.target.value }))}
                    className={cn("min-h-10 bg-white", !canEdit && "disabled:opacity-100")}
                  />
                  {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map((phrase) => (
                        <button
                          key={phrase}
                          type="button"
                          onClick={() => setTexts((current) => ({ ...current, [row.id]: phrase }))}
                          aria-label={tAverages("useSuggestion", { phrase, name })}
                          className="rounded-full bg-azure-50 px-2.5 py-1 text-left text-xs font-medium text-azure-700 ring-1 ring-azure-100 hover:bg-azure-100"
                        >
                          {phrase}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {canEdit && data.rows.length > 0 && (
        <div className="sticky bottom-24 z-10 flex max-w-4xl flex-col gap-3 rounded-xl bg-white p-4 shadow-lg ring-1 ring-line/70 sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
          <p className="text-sm text-muted-foreground" role="status">
            {isOffline
              ? tAverages("offline")
              : changed.length > 0
                ? tAverages("unsaved", { count: changed.length })
                : tAverages("upToDate")}
          </p>
          <Button size="touch" onClick={save} disabled={pending || isOffline || changed.length === 0}>
            {tAverages("save")}
          </Button>
        </div>
      )}
    </div>
  );
}
