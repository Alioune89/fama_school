"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CircleAlert, CircleCheck, CloudUpload, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOffline } from "next/offline";
import { useMessage } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/format";
import { offlineDb } from "@/lib/offline/db";
import { ACQUISITION_LEVELS, type AcquisitionLevel } from "@/lib/offline/operations";
import { enqueue } from "@/lib/offline/outbox";
import { cn } from "@/lib/utils";
import { KIND_STYLE } from "../../evaluations/kind-style";
import type { GradeSheetData } from "../queries";
import {
  cellsToMarks,
  formatScore,
  gradesRef,
  resolveSheet,
  sheetStats,
  shortcut,
  type Cell,
  type Cells,
  type SheetDraft,
} from "../sheet";
import { PublishButton } from "./publish-button";

/** Clé de la copie locale de la feuille, pour saisir les notes sans réseau. */
export const gradeSheetSnapshotKey = (evaluationId: string) => `snapshot:grades:${evaluationId}`;

const LEVEL_STYLE: Record<AcquisitionLevel, string> = {
  acquired: "bg-success-500 text-white ring-success-500",
  in_progress: "bg-warning-500 text-ink ring-warning-500",
  not_acquired: "bg-danger-500 text-white ring-danger-500",
};

/** Absent (compté 0) en rouge, comme à l'appel ; excusé (ne compte pas) en bleu. */
const STATUS_STYLE = {
  absent: "bg-danger-500 text-white ring-danger-500",
  excused: "bg-azure-600 text-white ring-azure-600",
} as const;

type LocalState = { key: string; cells: Cells; savedAt: string | null };

/** Case de saisie de la ligne suivante (Entrée, flèche du bas) ou précédente (flèche du haut). */
function moveFocus(event: KeyboardEvent<HTMLInputElement>, index: number) {
  const step = event.key === "Enter" || event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
  if (step === 0) return;
  event.preventDefault();
  const next = document.querySelector<HTMLInputElement>(`[data-grade-row="${index + step}"]`);
  next?.focus();
  next?.select();
}

/**
 * Feuille de notes d'une évaluation. Chaque frappe est gardée sur le téléphone ; « Enregistrer »
 * met toute la feuille dans la file d'envoi, qui part dès que le réseau le permet
 * (voir src/lib/offline/outbox.ts). Sur ordinateur, on enchaîne les élèves au clavier.
 */
export function GradeSheet({
  userId,
  data,
  editable,
  fromCache = false,
}: {
  userId: string;
  data: GradeSheetData;
  /** Faux pour une période verrouillée ou un lecteur qui ne note pas cette matière. */
  editable: boolean;
  /** Feuille relue sur le téléphone (pas de réseau) : on ne la réenregistre pas. */
  fromCache?: boolean;
}) {
  const t = useTranslations("grades");
  const tKinds = useTranslations("evaluations.kinds");
  const message = useMessage();
  const isOffline = useOffline();
  const canEdit = editable && !data.locked;
  const max = data.maxScore;
  const numeric = data.scale !== "appreciation" && max !== null;

  // Copie locale seulement pour qui peut noter : la feuille relue hors ligne s'ouvre en saisie.
  useEffect(() => {
    if (fromCache || !editable) return;
    void offlineDb().drafts.put({
      key: gradeSheetSnapshotKey(data.evaluationId),
      userId,
      data,
      updatedAt: new Date().toISOString(),
    });
  }, [data, editable, fromCache, userId]);

  const key = gradesRef(data.evaluationId);
  const draftRow = useLiveQuery(() => offlineDb().drafts.get(key), [key]);
  const outbox = useLiveQuery(
    () =>
      offlineDb()
        .outbox.where("ref")
        .equals(key)
        .filter((entry) => entry.userId === userId)
        .toArray(),
    [key, userId],
  );

  const draft = draftRow
    ? ({ ...(draftRow.data as Omit<SheetDraft, "updatedAt">), updatedAt: draftRow.updatedAt } satisfies SheetDraft)
    : null;
  const [local, setLocal] = useState<LocalState | null>(null);
  const current = local?.key === key ? local : resolveSheet(data.server, canEdit ? draft : null);
  const { marks, invalid } = cellsToMarks(current.cells, max);
  const stats = sheetStats(
    marks,
    data.roster.map((student) => student.id),
  );

  function update(studentId: string, cell: Cell | null) {
    const cells = { ...current.cells };
    if (cell) cells[studentId] = cell;
    else delete cells[studentId];
    setLocal({ key, cells, savedAt: null });
    void offlineDb().drafts.put({ key, userId, data: { cells, savedAt: null }, updatedAt: new Date().toISOString() });
  }

  function typeScore(studentId: string, text: string) {
    const status = shortcut(text);
    update(studentId, status ? { kind: status } : text.trim() === "" ? null : { kind: "score", text });
  }

  const toggleStatus = (studentId: string, status: "absent" | "excused") =>
    update(studentId, current.cells[studentId]?.kind === status ? null : { kind: status });

  async function save() {
    if (invalid.length > 0) {
      document.querySelector<HTMLInputElement>(`[aria-invalid="true"]`)?.focus();
      return;
    }
    const enteredAt = new Date().toISOString();
    const cells = current.cells;
    await offlineDb().drafts.put({ key, userId, data: { cells, savedAt: enteredAt }, updatedAt: enteredAt });
    await enqueue(
      userId,
      { id: crypto.randomUUID(), kind: "grades.entry", payload: { evaluationId: data.evaluationId, enteredAt, marks } },
      { ref: key, label: t("opLabel", { title: data.title, className: data.className }) },
    );
    setLocal({ key, cells, savedAt: enteredAt });
  }

  const pendingEntry = outbox?.find((entry) => entry.state === "pending");
  const rejectedEntry = outbox?.find((entry) => entry.state === "rejected");
  const synced = current.savedAt !== null && !pendingEntry && !rejectedEntry;
  const counts = [
    t("countGraded", { count: stats.graded }),
    stats.absent > 0 && t("countAbsent", { count: stats.absent }),
    stats.excused > 0 && t("countExcused", { count: stats.excused }),
    t("countMissing", { count: stats.missing }),
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", KIND_STYLE[data.kind])}>
              {tKinds(data.kind)}
            </span>
            <p className="text-lg font-bold text-ink">{data.title}</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[
              `${data.className} · ${data.subjectName}`,
              formatDate(data.heldOn, { weekday: "long", day: "numeric", month: "long" }),
              numeric ? t("onMax", { max: max! }) : t("levelsScale"),
              data.periodLabel,
            ].join(" · ")}
            {fromCache && <> · {t("cached")}</>}
          </p>
        </div>
        {editable && !fromCache && (
          <PublishButton
            evaluationId={data.evaluationId}
            publishedAt={data.publishedAt}
            synced={synced}
            hasGrades={stats.graded + stats.absent + stats.excused > 0}
          />
        )}
      </div>

      {data.locked ? (
        <p className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-ink-soft">
          <Lock className="size-4 shrink-0" aria-hidden />
          {t("locked", { label: data.periodLabel })}
        </p>
      ) : canEdit ? (
        <p className="text-sm text-muted-foreground">{numeric ? t("hintScores") : t("hintLevels")}</p>
      ) : (
        <p className="text-sm text-muted-foreground">{t("readOnly")}</p>
      )}

      {data.roster.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-muted-foreground shadow-card">{t("emptyRoster")}</p>
      ) : (
        <>
          <ol className="grid max-w-3xl gap-2" aria-label={t("rosterLabel")}>
            {data.roster.map((student, index) => {
              const name = `${student.firstName} ${student.lastName}`;
              const cell = current.cells[student.id];
              const isInvalid = invalid.includes(student.id);
              const absentLike = cell?.kind === "absent" || cell?.kind === "excused";
              return (
                <li
                  key={student.id}
                  className={cn(
                    "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-3 py-2 shadow-card ring-1",
                    absentLike ? "bg-muted ring-line" : "bg-white ring-line/70",
                  )}
                >
                  <span className="tabular w-6 shrink-0 text-right text-xs text-muted-foreground" aria-hidden>
                    {index + 1}
                  </span>
                  <span className={cn("min-w-0 flex-1 truncate text-ink", !numeric && "basis-40")}>
                    <span className="font-semibold">{student.lastName}</span> {student.firstName}
                  </span>
                  <span className={cn("flex items-center gap-1.5", !numeric && "ml-9 sm:ml-0")}>
                    {numeric ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        enterKeyHint="next"
                        autoComplete="off"
                        data-grade-row={index}
                        aria-label={t("scoreLabel", { name, max: max! })}
                        aria-invalid={isInvalid || undefined}
                        aria-describedby={isInvalid ? `grade-error-${student.id}` : undefined}
                        disabled={!canEdit}
                        value={cell?.kind === "score" ? cell.text : ""}
                        placeholder={
                          cell?.kind === "absent" ? t("absentShort") : cell?.kind === "excused" ? t("excusedShort") : "—"
                        }
                        onChange={(event) => typeScore(student.id, event.target.value)}
                        onKeyDown={(event) => moveFocus(event, index)}
                        onFocus={(event) => event.target.select()}
                        className={cn(
                          "tabular h-11 w-20 rounded-lg bg-white px-3 text-right text-base font-semibold text-ink ring-1 ring-line outline-none placeholder:font-medium placeholder:text-muted-foreground focus:ring-2 focus:ring-azure-500 disabled:bg-transparent disabled:ring-0",
                          isInvalid && "bg-danger-50 ring-2 ring-danger-500 focus:ring-danger-500",
                        )}
                      />
                    ) : (
                      <span role="radiogroup" aria-label={t("levelLabel", { name })} className="flex gap-1">
                        {ACQUISITION_LEVELS.map((level) => {
                          const checked = cell?.kind === "level" && cell.level === level;
                          return (
                            <button
                              key={level}
                              type="button"
                              role="radio"
                              aria-checked={checked}
                              disabled={!canEdit}
                              onClick={() => update(student.id, checked ? null : { kind: "level", level })}
                              className={cn(
                                "h-10 rounded-lg px-2 text-xs font-semibold ring-1 transition-colors disabled:opacity-100 sm:px-2.5",
                                checked ? LEVEL_STYLE[level] : "bg-white text-ink-soft ring-line hover:text-ink",
                              )}
                            >
                              {t(`levels.${level}`)}
                            </button>
                          );
                        })}
                      </span>
                    )}
                    {(["absent", "excused"] as const).map((status) => {
                      const pressed = cell?.kind === status;
                      if (!canEdit && !pressed) return null;
                      return (
                        <button
                          key={status}
                          type="button"
                          aria-pressed={pressed}
                          disabled={!canEdit}
                          aria-label={t(status === "absent" ? "markAbsent" : "markExcused", { name })}
                          title={t(status === "absent" ? "absentHint" : "excusedHint")}
                          onClick={() => toggleStatus(student.id, status)}
                          className={cn(
                            "h-10 min-w-11 rounded-lg px-2 text-xs font-semibold ring-1 transition-colors disabled:opacity-100",
                            pressed ? STATUS_STYLE[status] : "bg-white text-ink-soft ring-line hover:text-ink",
                          )}
                        >
                          {t(status === "absent" ? "absentShort" : "excusedShort")}
                        </button>
                      );
                    })}
                  </span>
                  {isInvalid && (
                    <span id={`grade-error-${student.id}`} className="basis-full pl-9 text-xs font-medium text-danger-700">
                      {t("invalid", { max: max! })}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="sticky bottom-24 z-10 flex max-w-3xl flex-col gap-3 rounded-xl bg-white p-4 shadow-lg ring-1 ring-line/70 sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
            <div className="space-y-1 text-sm">
              <p className="tabular font-medium text-ink-soft" aria-live="polite">
                {counts.join(" · ")}
              </p>
              {numeric && stats.average !== null && (
                <p className="tabular text-muted-foreground">
                  {t("averageLine", {
                    average: formatScore(stats.average),
                    highest: formatScore(stats.highest!),
                    lowest: formatScore(stats.lowest!),
                    max: max!,
                  })}
                </p>
              )}
              {!numeric && stats.graded > 0 && (
                <p className="tabular text-muted-foreground">
                  {t("levelsLine", {
                    acquired: stats.levels.acquired,
                    inProgress: stats.levels.in_progress,
                    notAcquired: stats.levels.not_acquired,
                  })}
                </p>
              )}
              {canEdit && (
                <p className="flex items-start gap-2" role="status">
                  {invalid.length > 0 ? (
                    <>
                      <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger-500" aria-hidden />
                      <span className="text-danger-700">{t("invalidCount", { count: invalid.length })}</span>
                    </>
                  ) : current.savedAt === null ? (
                    <span className="text-muted-foreground">{t("notSaved")}</span>
                  ) : rejectedEntry ? (
                    <>
                      <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger-500" aria-hidden />
                      <span className="text-danger-700">{t("rejected", { error: message(rejectedEntry.error) ?? "" })}</span>
                    </>
                  ) : pendingEntry ? (
                    <>
                      <CloudUpload className="mt-0.5 size-4 shrink-0 text-warning-700" aria-hidden />
                      <span className="text-warning-700">{isOffline ? t("savedOffline") : t("sending")}</span>
                    </>
                  ) : (
                    <>
                      <CircleCheck className="mt-0.5 size-4 shrink-0 text-success-500" aria-hidden />
                      <span className="text-success-700">{t("sent", { time: formatTime(current.savedAt) })}</span>
                    </>
                  )}
                </p>
              )}
            </div>
            {canEdit && (
              <Button size="touch" onClick={() => void save()} disabled={current.savedAt !== null && !rejectedEntry}>
                {t("save")}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
