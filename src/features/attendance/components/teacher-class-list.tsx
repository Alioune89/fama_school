"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOffline } from "next/offline";
import { StatusPill } from "@/components/dashboard/status-pill";
import { todayInDakar } from "@/features/dashboard/calendar";
import { Link } from "@/i18n/navigation";
import { formatTime } from "@/lib/format";
import { offlineDb, type Draft } from "@/lib/offline/db";
import { ATTENDANCE_SLOTS } from "@/lib/offline/operations";
import type { TeacherClass } from "../queries";
import { rollCallRef } from "../roll-call";

const SNAPSHOT_KEY = "snapshot:teacherClasses";
type Snapshot = { date: string; classes: TeacherClass[] };

/** Classes du professeur avec l'état des appels du jour ; la liste est gardée sur le téléphone pour le hors ligne. */
export function TeacherClassList({ userId, date, classes }: { userId: string; date: string; classes: TeacherClass[] }) {
  const t = useTranslations("attendance.rollCall");
  const tSlots = useTranslations("attendance.slots");

  useEffect(() => {
    void offlineDb().drafts.put({
      key: SNAPSHOT_KEY,
      userId,
      data: { date, classes } satisfies Snapshot,
      updatedAt: new Date().toISOString(),
    });
  }, [classes, date, userId]);

  // Appels validés sur ce téléphone mais pas encore partis.
  const pendingRefs = useLiveQuery(
    async () =>
      new Set((await offlineDb().outbox.where("[userId+state]").equals([userId, "pending"]).toArray()).map((entry) => entry.ref)),
    [userId],
  );
  // Une liste gardée depuis la veille ne dit rien des appels du jour.
  const today = todayInDakar();

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {classes.map((item) => (
        <li key={item.id}>
          <Link
            href={`/professeur/appel/${item.id}`}
            className="flex h-full flex-col gap-3 rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70 transition-shadow hover:shadow-md sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-lg font-bold text-ink">
                  {item.name}
                  {item.isHomeroom && <Star className="size-4 fill-sun-400 text-sun-500" aria-label={t("homeroom")} />}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.levelLabel} · {t("students", { count: item.studentCount })}
                  {item.subjects.length > 0 && <> · {item.subjects.join(", ")}</>}
                </p>
              </div>
              <ChevronRight className="mt-1 size-5 shrink-0 text-ink-soft" aria-hidden />
            </div>
            <div className="flex flex-wrap gap-2">
              {ATTENDANCE_SLOTS.map((slot) => {
                const summary = date === today ? item.slots[slot] : null;
                const label = tSlots(slot);
                if (pendingRefs?.has(rollCallRef(item.id, today, slot))) {
                  return (
                    <StatusPill key={slot} tone="warning">
                      {t("slotPending", { slot: label })}
                    </StatusPill>
                  );
                }
                if (!summary) {
                  return (
                    <StatusPill key={slot} tone="neutral">
                      {t("slotTodo", { slot: label })}
                    </StatusPill>
                  );
                }
                return (
                  <StatusPill key={slot} tone={summary.absent > 0 ? "danger" : "success"}>
                    {t("slotDone", {
                      slot: label,
                      time: formatTime(summary.takenAt),
                      absent: summary.absent,
                      late: summary.late,
                    })}
                  </StatusPill>
                );
              })}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Pendant le chargement : sans réseau, la liste gardée sur le téléphone. */
export function TeacherClassListFallback() {
  const t = useTranslations("attendance.rollCall");
  const isOffline = useOffline();
  const [snapshot, setSnapshot] = useState<Draft | null>(null);

  useEffect(() => {
    void offlineDb()
      .drafts.get(SNAPSHOT_KEY)
      .then((row) => setSnapshot(row ?? null));
  }, []);

  if (isOffline && snapshot) {
    const { date, classes } = snapshot.data as Snapshot;
    return (
      <>
        <p className="mb-3 text-sm text-muted-foreground">{t("cached")}</p>
        <TeacherClassList userId={snapshot.userId} date={date} classes={classes} />
      </>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-xl bg-white shadow-card" />
      ))}
    </div>
  );
}
