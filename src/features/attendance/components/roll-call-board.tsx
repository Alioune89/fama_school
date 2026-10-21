"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CircleAlert, CircleCheck, CloudUpload, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOffline } from "next/offline";
import { useMessage } from "@/components/forms/use-action-form";
import { PersonAvatar } from "@/components/people/person-avatar";
import { Button } from "@/components/ui/button";
import { todayInDakar } from "@/features/dashboard/calendar";
import { formatDate, formatTime } from "@/lib/format";
import { offlineDb } from "@/lib/offline/db";
import { ATTENDANCE_SLOTS, type AttendanceSlot, type AttendanceStatus } from "@/lib/offline/operations";
import { enqueue } from "@/lib/offline/outbox";
import { cn } from "@/lib/utils";
import type { RollCallData } from "../queries";
import { countMarks, nextStatus, resolveRollCall, rollCallRef, type Marks, type RollCallDraft } from "../roll-call";

/** Clé de la copie locale de la liste d'appel, pour faire l'appel sans réseau. */
export const rollCallSnapshotKey = (classId: string) => `snapshot:rollCall:${classId}`;

const STATUS_STYLES: Record<AttendanceStatus, { row: string; chip: string }> = {
  present: { row: "bg-white ring-line/70", chip: "bg-success-50 text-success-700" },
  absent: { row: "bg-danger-50 ring-danger-500/30", chip: "bg-danger-500 text-white" },
  late: { row: "bg-warning-50 ring-warning-500/30", chip: "bg-warning-500 text-ink" },
};

const noSubscription = () => () => {};

type LocalState = { key: string; marks: Marks; validatedAt: string | null };

/**
 * Appel d'une classe. Tout le monde est présent par défaut ; un toucher marque absent, puis en retard.
 * Chaque toucher est gardé sur le téléphone ; « Valider » met l'appel dans la file d'envoi,
 * qui part dès que le réseau le permet (voir src/lib/offline/outbox.ts).
 */
export function RollCallBoard({
  userId,
  data,
  initialSlot,
  fromCache = false,
}: {
  userId: string;
  data: RollCallData;
  initialSlot: AttendanceSlot;
  /** Liste relue sur le téléphone (pas de réseau) : on ne la réenregistre pas. */
  fromCache?: boolean;
}) {
  const t = useTranslations("attendance.rollCall");
  const tSlots = useTranslations("attendance.slots");
  const tStatuses = useTranslations("attendance.statuses");
  const message = useMessage();
  const isOffline = useOffline();

  const [slot, setSlot] = useState(initialSlot);
  // La date est celle du téléphone : une liste gardée hors ligne depuis la veille sert pour l'appel du jour.
  const date = useSyncExternalStore(noSubscription, todayInDakar, () => data.date);

  useEffect(() => {
    if (fromCache) return;
    void offlineDb().drafts.put({
      key: rollCallSnapshotKey(data.classId),
      userId,
      data,
      updatedAt: new Date().toISOString(),
    });
  }, [data, fromCache, userId]);

  const key = rollCallRef(data.classId, date, slot);
  const server = date === data.date ? (data.sessions[slot] ?? null) : null;
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
    ? ({ ...(draftRow.data as Omit<RollCallDraft, "updatedAt">), updatedAt: draftRow.updatedAt } satisfies RollCallDraft)
    : null;
  const [local, setLocal] = useState<LocalState | null>(null);
  const current = local?.key === key ? local : resolveRollCall(data.roster, server, draft);
  const counts = countMarks(current.marks);

  async function save(marks: Marks, validatedAt: string | null) {
    const updatedAt = new Date().toISOString();
    await offlineDb().drafts.put({ key, userId, data: { marks, validatedAt }, updatedAt });
  }

  function update(marks: Marks) {
    setLocal({ key, marks, validatedAt: null });
    void save(marks, null);
  }

  const toggle = (studentId: string) =>
    update({ ...current.marks, [studentId]: nextStatus(current.marks[studentId] ?? "present") });

  const allPresent = () => update(Object.fromEntries(data.roster.map((student) => [student.id, "present" as const])));

  async function validate() {
    const takenAt = new Date().toISOString();
    const marks = current.marks;
    await save(marks, takenAt);
    await enqueue(
      userId,
      { id: crypto.randomUUID(), kind: "attendance.rollCall", payload: { classId: data.classId, date, slot, takenAt, marks } },
      {
        ref: key,
        label: t("opLabel", {
          className: data.className,
          slot: tSlots(slot).toLowerCase(),
          date: formatDate(date, { day: "numeric", month: "long" }),
        }),
      },
    );
    setLocal({ key, marks, validatedAt: takenAt });
  }

  const pendingEntry = outbox?.find((entry) => entry.state === "pending");
  const rejectedEntry = outbox?.find((entry) => entry.state === "rejected");
  const wasValidated = server !== null || draft?.validatedAt != null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-lg font-bold text-ink">
            {data.className} <span className="text-sm font-medium text-muted-foreground">· {data.levelLabel}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {formatDate(date, { weekday: "long", day: "numeric", month: "long" })}
            {fromCache && <> · {t("cached")}</>}
          </p>
        </div>
        <div role="radiogroup" aria-label={t("slotLabel")} className="inline-flex rounded-full bg-azure-50 p-1">
          {ATTENDANCE_SLOTS.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={slot === value}
              onClick={() => setSlot(value)}
              className={cn(
                "h-9 rounded-full px-4 text-sm font-semibold transition-colors",
                slot === value ? "bg-white text-ink shadow-card" : "text-ink-soft hover:text-ink",
              )}
            >
              {tSlots(value)}
            </button>
          ))}
        </div>
      </div>

      {data.roster.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-muted-foreground shadow-card">{t("emptyRoster")}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="tabular text-sm font-medium text-ink-soft" aria-live="polite">
              {t("summary", counts)}
            </p>
            {(counts.absent > 0 || counts.late > 0) && (
              <Button variant="ghost" size="sm" onClick={allPresent}>
                <RotateCcw aria-hidden />
                {t("allPresent")}
              </Button>
            )}
          </div>

          <ul className="grid gap-2 lg:grid-cols-2" aria-label={t("rosterLabel")}>
            {data.roster.map((student) => {
              const status = current.marks[student.id] ?? "present";
              const name = `${student.firstName} ${student.lastName}`;
              return (
                <li key={student.id}>
                  <button
                    type="button"
                    onClick={() => toggle(student.id)}
                    aria-label={t("studentStatus", { name, status: tStatuses(status) })}
                    className={cn(
                      "flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left shadow-card ring-1 transition-colors active:scale-[0.99]",
                      STATUS_STYLES[status].row,
                    )}
                  >
                    <PersonAvatar name={name} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-ink">
                      <span className="font-semibold">{student.lastName}</span> {student.firstName}
                    </span>
                    <span
                      className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLES[status].chip)}
                      aria-hidden
                    >
                      {tStatuses(status)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="sticky bottom-24 z-10 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-lg ring-1 ring-line/70 sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
            <p className="flex items-start gap-2 text-sm" role="status">
              {current.validatedAt === null ? (
                <span className="text-muted-foreground">{t("notValidated")}</span>
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
                  <span className="text-success-700">{t("sent", { time: formatTime(current.validatedAt) })}</span>
                </>
              )}
            </p>
            <Button size="touch" onClick={() => void validate()} disabled={current.validatedAt !== null && !rejectedEntry}>
              {wasValidated ? t("update") : t("validate")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
