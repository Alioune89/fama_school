"use client";

import { useState, useTransition } from "react";
import { Lock, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOffline } from "next/offline";
import { toast } from "sonner";
import { useMessage } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { appreciation, type Rank } from "@/lib/domain/grading";
import { cn } from "@/lib/utils";
import { saveCouncilDecisions } from "../actions";
import type { ClassCouncil, CouncilRow } from "../council-queries";
import { formatAverage } from "../sheet";

const SCALE_MAX = { ten: 10, twenty: 20 } as const;
const SANCTIONS = [null, "warning", "blame"] as const;
type Sanction = (typeof SANCTIONS)[number];
type Decision = { sanction: Sanction; withholdMention: boolean; appreciation: string };
const EMPTY_DECISION: Decision = { sanction: null, withholdMention: false, appreciation: "" };

const SANCTION_STYLE: Record<NonNullable<Sanction>, string> = {
  warning: "bg-warning-500 text-ink ring-warning-500",
  blame: "bg-danger-500 text-white ring-danger-500",
};

const sameDecision = (a: Decision, row: CouncilRow) =>
  a.sanction === row.sanction && a.withholdMention === row.withholdMention && a.appreciation.trim() === row.appreciation;

/** Ordre du conseil : par rang, puis les élèves sans moyenne, par nom. */
const byRank = (a: CouncilRow, b: CouncilRow) =>
  (a.rank?.rank ?? Infinity) - (b.rank?.rank ?? Infinity) || a.lastName.localeCompare(b.lastName, "fr");

/**
 * Conseil de classe : moyenne générale, rang et mention de chaque élève, avec les décisions du conseil
 * (avertissement ou blâme, mention refusée) et l'appréciation générale reprise sur le bulletin.
 */
export function CouncilBoard({ data, editable }: { data: ClassCouncil; editable: boolean }) {
  const t = useTranslations("grades.council");
  const tAverages = useTranslations("grades.averages");
  const tLevels = useTranslations("grades.levels");
  const tMentions = useTranslations("setup.evaluation");
  const message = useMessage();
  const isOffline = useOffline();
  const [pending, startTransition] = useTransition();
  const canEdit = editable && !data.locked;
  const max = data.scale === "appreciation" ? null : SCALE_MAX[data.scale];
  const rows = [...data.rows].sort(byRank);

  const [decisions, setDecisions] = useState<Record<string, Decision>>(() =>
    Object.fromEntries(
      data.rows.map((row) => [
        row.id,
        { sanction: row.sanction, withholdMention: row.withholdMention, appreciation: row.appreciation },
      ]),
    ),
  );
  const decisionOf = (row: CouncilRow) => decisions[row.id] ?? EMPTY_DECISION;
  const update = (id: string, patch: Partial<Decision>) =>
    setDecisions((current) => ({ ...current, [id]: { ...(current[id] ?? EMPTY_DECISION), ...patch } }));
  const changed = data.rows.filter((row) => !sameDecision(decisionOf(row), row));

  const suggest = (row: CouncilRow) => {
    const key = data.scale === "appreciation" ? null : appreciation(row.general, data.scale);
    return key ? (["a", "b"] as const).map((variant) => tAverages(`suggestions.${key}.${variant}`)) : [];
  };
  const emptyWithSuggestion = rows.filter((row) => !decisionOf(row).appreciation.trim() && suggest(row).length > 0);

  const rankLabel = (rank: Rank) => tAverages(rank.exAequo ? "rankExAequo" : "rank", { rank: rank.rank });

  function fillEmpty() {
    setDecisions((current) => {
      const next = { ...current };
      for (const row of emptyWithSuggestion)
        next[row.id] = { ...(next[row.id] ?? EMPTY_DECISION), appreciation: suggest(row)[0]! };
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const result = await saveCouncilDecisions({
        classId: data.classId,
        periodId: data.periodId,
        items: Object.fromEntries(
          changed.map((row) => {
            const decision = decisionOf(row);
            return [row.id, { ...decision, appreciation: decision.appreciation.trim() }];
          }),
        ),
      });
      if (result.ok) toast.success(t("saved"));
      else toast.error(message(result.error));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-lg font-bold text-ink">
            {data.className} · {data.periodLabel}
          </p>
          <p className="text-sm text-muted-foreground">
            {max !== null ? t("generalHint", { count: data.subjects.length }) : t("levelsHint")}
          </p>
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
      ) : canEdit && emptyWithSuggestion.length > 0 ? (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={fillEmpty}>
            <Sparkles aria-hidden />
            {tAverages("fillEmpty", { count: emptyWithSuggestion.length })}
          </Button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-muted-foreground shadow-card">{t("emptyRoster")}</p>
      ) : (
        <ol className="grid max-w-4xl gap-2" aria-label={t("listLabel")}>
          {rows.map((row) => {
            const name = `${row.firstName} ${row.lastName}`;
            const decision = decisionOf(row);
            const suggestions = canEdit ? suggest(row).filter((phrase) => phrase !== decision.appreciation.trim()) : [];
            return (
              <li key={row.id} className="rounded-xl bg-white p-3 shadow-card ring-1 ring-line/70 sm:p-4">
                <div className="flex items-start gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-ink">
                      <span className="font-semibold">{row.lastName}</span> {row.firstName}
                    </span>
                    {row.mention && (
                      <span
                        className={cn(
                          "mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          decision.withholdMention
                            ? "bg-muted text-muted-foreground line-through"
                            : "bg-success-50 text-success-700",
                        )}
                      >
                        {tMentions(row.mention)}
                      </span>
                    )}
                  </span>
                  {max !== null && (
                    <span className="tabular shrink-0 text-right">
                      {row.general !== null ? (
                        <>
                          <span className="text-base font-bold text-ink">{formatAverage(row.general)}</span>
                          <span className="text-xs text-muted-foreground">/{max}</span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">{tAverages("noAverage")}</span>
                      )}
                      {row.rank && <span className="block text-xs font-semibold text-ink-soft">{rankLabel(row.rank)}</span>}
                    </span>
                  )}
                </div>
                <p className="tabular mt-1 text-xs text-muted-foreground">
                  {data.subjects
                    .flatMap((subject, index) => {
                      const result = row.subjects[index]!;
                      if (result.average !== null) return [`${subject.name} : ${formatAverage(result.average)}`];
                      return result.summary ? [`${subject.name} : ${tLevels(result.summary)}`] : [];
                    })
                    .join(" · ")}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span role="radiogroup" aria-label={t("sanctionLabel", { name })} className="flex gap-1">
                    {SANCTIONS.map((sanction) => {
                      const checked = decision.sanction === sanction;
                      if (!canEdit && !checked) return null;
                      return (
                        <button
                          key={sanction ?? "none"}
                          type="button"
                          role="radio"
                          aria-checked={checked}
                          disabled={!canEdit}
                          onClick={() => update(row.id, { sanction })}
                          className={cn(
                            "h-9 rounded-lg px-2.5 text-xs font-semibold ring-1 transition-colors disabled:opacity-100",
                            checked
                              ? sanction
                                ? SANCTION_STYLE[sanction]
                                : "bg-azure-100 text-ink ring-azure-500"
                              : "bg-white text-ink-soft ring-line hover:text-ink",
                          )}
                        >
                          {t(`sanctions.${sanction ?? "none"}`)}
                        </button>
                      );
                    })}
                  </span>
                  {row.mention && (
                    <label className="flex items-center gap-2 text-sm text-ink-soft">
                      <Checkbox
                        checked={decision.withholdMention}
                        disabled={!canEdit}
                        onCheckedChange={(checked) => update(row.id, { withholdMention: checked === true })}
                      />
                      {t("withholdMention")}
                    </label>
                  )}
                </div>

                <div className="mt-2 space-y-1.5">
                  <Textarea
                    rows={1}
                    maxLength={400}
                    aria-label={t("appreciationLabel", { name })}
                    placeholder={canEdit ? t("appreciationPlaceholder") : tAverages("noAppreciation")}
                    disabled={!canEdit}
                    value={decision.appreciation}
                    onChange={(event) => update(row.id, { appreciation: event.target.value })}
                    className={cn("min-h-10 bg-white", !canEdit && "disabled:opacity-100")}
                  />
                  {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map((phrase) => (
                        <button
                          key={phrase}
                          type="button"
                          onClick={() => update(row.id, { appreciation: phrase })}
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

      {canEdit && rows.length > 0 && (
        <div className="sticky bottom-24 z-10 flex max-w-4xl flex-col gap-3 rounded-xl bg-white p-4 shadow-lg ring-1 ring-line/70 sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
          <p className="text-sm text-muted-foreground" role="status">
            {isOffline ? t("offline") : changed.length > 0 ? t("unsaved", { count: changed.length }) : t("upToDate")}
          </p>
          <Button size="touch" onClick={save} disabled={pending || isOffline || changed.length === 0}>
            {t("save")}
          </Button>
        </div>
      )}
    </div>
  );
}
