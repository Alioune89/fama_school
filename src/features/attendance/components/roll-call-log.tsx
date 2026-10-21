import { ArrowRight, History, Smartphone, UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { StatusPill, type StatusTone } from "@/components/dashboard/status-pill";
import { EmptyState } from "@/components/layout/empty-state";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";
import { formatDate, formatTime } from "@/lib/format";
import type { AttendanceStatus } from "@/lib/offline/operations";
import { getRollCallLog, type RollCallLogEntry } from "../direction-queries";

/** Au-delà de cet écart entre l'heure de l'appel et sa réception, l'appel est parti plus tard (hors ligne). */
const LATE_SYNC_MS = 5 * 60 * 1000;

const STATUS_TONE: Record<AttendanceStatus, StatusTone> = { present: "success", absent: "danger", late: "warning" };

async function Status({ status }: { status: AttendanceStatus }) {
  const t = await getTranslations("attendance.statuses");
  return <StatusPill tone={STATUS_TONE[status]}>{t(status)}</StatusPill>;
}

async function Entry({ entry }: { entry: RollCallLogEntry }) {
  const t = await getTranslations("attendance.history");
  const tSlots = await getTranslations("attendance.slots");
  const syncedLate = new Date(entry.receivedAt).getTime() - new Date(entry.takenAt).getTime() > LATE_SYNC_MS;
  const sameDay = entry.takenAt.slice(0, 10) === entry.receivedAt.slice(0, 10);
  const received = sameDay
    ? formatTime(entry.receivedAt)
    : `${formatDate(entry.receivedAt, { day: "numeric", month: "long" })} ${formatTime(entry.receivedAt)}`;

  return (
    <li className="rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-ink">
          {entry.className} · {tSlots(entry.slot)}
        </p>
        {entry.outcome === "stale" ? (
          <StatusPill tone="neutral">{t("stale")}</StatusPill>
        ) : entry.isFirst ? (
          <StatusPill tone="info">{t("first")}</StatusPill>
        ) : (
          <StatusPill tone="lavender">{t("correction")}</StatusPill>
        )}
      </div>

      <dl className="mt-2 grid gap-1 text-sm text-ink-soft sm:grid-cols-2">
        <div className="flex items-center gap-1.5">
          <UserRound className="size-4 shrink-0" aria-hidden />
          <dt className="sr-only">{t("author")}</dt>
          <dd>{entry.author ?? t("unknownAuthor")}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Smartphone className="size-4 shrink-0" aria-hidden />
          <dt className="sr-only">{t("times")}</dt>
          <dd>
            {t("takenAt", {
              date: formatDate(entry.takenAt, { weekday: "long", day: "numeric", month: "long" }),
              time: formatTime(entry.takenAt),
            })}{" "}
            · {t("receivedAt", { time: received })}
            {syncedLate && <span className="text-warning-700"> · {t("syncedLater")}</span>}
          </dd>
        </div>
      </dl>

      {entry.outcome === "stale" ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("staleHint")}</p>
      ) : (
        <>
          {entry.changes.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{entry.isFirst ? t("allPresent") : t("noChange")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line" aria-label={t("changesLabel")}>
              {entry.changes.map((change) => (
                <li key={change.studentId} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                  <Link
                    href={`/direction/eleves/${change.studentId}`}
                    className="min-w-0 flex-1 font-medium text-ink hover:underline"
                  >
                    {change.name}
                  </Link>
                  {change.previous && (
                    <>
                      <Status status={change.previous} />
                      <ArrowRight className="size-3.5 text-muted-foreground" aria-label={t("becomes")} />
                    </>
                  )}
                  <Status status={change.next} />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{t("after", { absent: entry.absent, late: entry.late })}</p>
        </>
      )}
    </li>
  );
}

/** Journal des appels d'une journée (données de requête : sous <Suspense>). */
export async function RollCallLog({ date, classId }: { date: string; classId: string | null }) {
  const { entry } = await requireSpace("direction");
  const [entries, t] = await Promise.all([getRollCallLog(entry.schoolId!, date, classId), getTranslations("attendance.history")]);
  if (entries.length === 0) return <EmptyState icon={History} title={t("empty")} body={t("emptyHint")} />;
  return (
    <ol className="space-y-3" aria-label={t("listLabel")}>
      {entries.map((item) => (
        <Entry key={item.id} entry={item} />
      ))}
    </ol>
  );
}
