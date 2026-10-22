"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Camera, CameraOff, CircleAlert, CircleCheck, Clock, LogIn, LogOut, Search, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { todayInDakar } from "@/features/dashboard/calendar";
import { formatTime } from "@/lib/format";
import { offlineDb } from "@/lib/offline/db";
import { enqueue } from "@/lib/offline/outbox";
import { cn } from "@/lib/utils";
import { isRepeatScan, parseBadge } from "../badge";
import type { Badge } from "../queries";
import { useQrScanner } from "../use-qr-scanner";

export type ArrivalSnapshot = {
  schoolId: string;
  date: string;
  badges: Badge[];
  /** Heure d'arrivée (ISO) par élève, connue du serveur au chargement. */
  arrivals: Record<string, string>;
  /** Heure de sortie (ISO) par élève (absent des cartes gardées avant l'ajout des sorties). */
  departures?: Record<string, string>;
};

/** Cartes gardées sur le téléphone pour pointer sans réseau. */
export const ARRIVAL_SNAPSHOT_KEY = "snapshot:arrivals";

export type CheckInMode = "arrival" | "departure";

/** Entrée ou sortie : opération envoyée, passages gardés sur le téléphone, libellés. */
const MODES = {
  arrival: {
    kind: "checkin.arrival",
    local: "arrivals",
    doneAt: "arrivedAt",
    alreadyAt: "alreadyAt",
    count: "count",
    opLabel: "opLabel",
    recentEmpty: "recentEmpty",
  },
  departure: {
    kind: "checkin.departure",
    local: "departures",
    doneAt: "leftAt",
    alreadyAt: "alreadyLeftAt",
    count: "countDepartures",
    opLabel: "opLabelDeparture",
    recentEmpty: "recentEmptyDepartures",
  },
} as const;

const noSubscription = () => () => {};
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

type Feedback =
  | { kind: "done"; mode: CheckInMode; badge: Badge; at: string }
  | { kind: "already"; mode: CheckInMode; badge: Badge; at: string }
  | { kind: "unknown" };

/**
 * Pointage à l'entrée et à la sortie : la caméra lit les cartes, le passage est enregistré sur le téléphone
 * puis envoyé (hors ligne compris). Une carte oubliée se pointe en cherchant l'élève par son nom.
 */
export function ArrivalScanner({
  userId,
  snapshot,
  fromCache = false,
}: {
  userId: string;
  snapshot: ArrivalSnapshot;
  fromCache?: boolean;
}) {
  const t = useTranslations("arrivals");
  const date = useSyncExternalStore(noSubscription, todayInDakar, () => snapshot.date);
  const [feedback, setFeedback] = useState<{ id: number; value: Feedback } | null>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<CheckInMode>("arrival");
  const config = MODES[mode];
  const lastScan = useRef<{ token: string; at: number } | null>(null);

  useEffect(() => {
    if (fromCache) return;
    void offlineDb().drafts.put({ key: ARRIVAL_SNAPSHOT_KEY, userId, data: snapshot, updatedAt: new Date().toISOString() });
  }, [fromCache, snapshot, userId]);

  const key = `${config.local}:${snapshot.schoolId}:${date}`;
  const localRow = useLiveQuery(() => offlineDb().drafts.get(key), [key]);
  /** Heure de passage par élève pour le mode choisi : connue du serveur, plus les scans du téléphone. */
  const passages = useMemo(() => {
    const server = mode === "arrival" ? snapshot.arrivals : (snapshot.departures ?? {});
    const merged: Record<string, string> = date === snapshot.date ? { ...server } : {};
    for (const [studentId, at] of Object.entries((localRow?.data as Record<string, string> | undefined) ?? {})) {
      if (!merged[studentId] || at < merged[studentId]) merged[studentId] = at;
    }
    return merged;
  }, [date, localRow, mode, snapshot]);

  const byToken = useMemo(() => new Map(snapshot.badges.map((b) => [b.token, b])), [snapshot.badges]);
  const byStudent = useMemo(() => new Map(snapshot.badges.map((b) => [b.studentId, b])), [snapshot.badges]);

  const show = (value: Feedback) => setFeedback((previous) => ({ id: (previous?.id ?? 0) + 1, value }));

  /** Scan : résultat sur l'image de la caméra. Recherche par le nom : notification (la caméra peut être hors écran). */
  async function checkIn(badge: Badge, source: "scan" | "manual") {
    const known = passages[badge.studentId];
    if (known) {
      show({ kind: "already", mode, badge, at: known });
      return;
    }
    const at = new Date().toISOString();
    if (source === "scan") show({ kind: "done", mode, badge, at });
    else toast.success(`${badge.firstName} ${badge.lastName} · ${t(config.doneAt, { time: formatTime(at) })}`);
    navigator.vibrate?.(60);
    const db = offlineDb();
    await db.transaction("rw", db.drafts, async () => {
      const row = await db.drafts.get(key);
      const data = { ...((row?.data as Record<string, string> | undefined) ?? {}), [badge.studentId]: at };
      await db.drafts.put({ key, userId, data, updatedAt: at });
    });
    await enqueue(
      userId,
      { id: crypto.randomUUID(), kind: config.kind, payload: { studentId: badge.studentId, scannedAt: at } },
      { ref: `${mode}:${badge.studentId}:${date}`, label: t(config.opLabel, { name: `${badge.firstName} ${badge.lastName}` }) },
    );
  }

  const { videoRef, active, starting, problem, start, stop } = useQrScanner((text) => {
    const token = parseBadge(text);
    const now = Date.now();
    if (isRepeatScan(lastScan.current, token ?? text, now)) return;
    lastScan.current = { token: token ?? text, at: now };
    const badge = token ? byToken.get(token) : undefined;
    if (!badge) {
      show({ kind: "unknown" });
      navigator.vibrate?.([40, 60, 40]);
      return;
    }
    void checkIn(badge, "scan");
  });

  const matches = useMemo(() => {
    const needle = normalize(query.trim());
    if (needle.length < 2) return [];
    return snapshot.badges
      .filter((b) => normalize(`${b.firstName} ${b.lastName} ${b.lastName} ${b.firstName}`).includes(needle))
      .slice(0, 8);
  }, [query, snapshot.badges]);

  const recent = Object.entries(passages)
    .sort(([, a], [, b]) => b.localeCompare(a))
    .slice(0, 15)
    .flatMap(([studentId, at]) => {
      const badge = byStudent.get(studentId);
      return badge ? [{ badge, at }] : [];
    });
  const passedCount = Object.keys(passages).filter((id) => byStudent.has(id)).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]">
      <div className="space-y-4">
        <div
          role="radiogroup"
          aria-label={t("modeLabel")}
          className="grid grid-cols-2 gap-1 rounded-full bg-white p-1 shadow-card ring-1 ring-line/70"
        >
          {(["arrival", "departure"] as const).map((value) => {
            const Icon = value === "arrival" ? LogIn : LogOut;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                onClick={() => {
                  setMode(value);
                  setFeedback(null);
                }}
                className={cn(
                  "inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors",
                  mode === value ? "bg-azure-100 text-ink" : "text-ink-soft hover:text-ink",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {t(`modes.${value}`)}
              </button>
            );
          })}
        </div>
        {fromCache && (
          <p className="flex items-start gap-2 rounded-xl bg-sun-200/60 p-4 text-sm text-ink">
            <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t("fromCache")}
          </p>
        )}
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-ink shadow-card">
          <video ref={videoRef} muted playsInline className={cn("size-full object-cover", !active && "invisible")} />
          {active ? (
            <>
              <div aria-hidden className="pointer-events-none absolute inset-[18%] rounded-2xl ring-4 ring-white/80" />
              {/* Résultat par-dessus l'image : il reste visible sur un téléphone pendant le scan. */}
              <div role="status" aria-live="polite" className="absolute inset-x-3 bottom-3">
                {feedback && <FeedbackBanner key={feedback.id} feedback={feedback.value} />}
              </div>
            </>
          ) : (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div className="space-y-4">
                <Camera className="mx-auto size-10 text-white/80" aria-hidden />
                <p className="text-sm text-white/80">{t("cameraHint")}</p>
                <Button size="touch" onClick={() => void start()} disabled={starting}>
                  {t("start")}
                </Button>
              </div>
            </div>
          )}
        </div>
        {problem && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-50 p-4 text-sm text-danger-700">
            <CameraOff className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t(`camera.${problem}`)}
          </p>
        )}
        {active && (
          <Button variant="outline" className="w-full" onClick={stop}>
            <CameraOff aria-hidden />
            {t("stop")}
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <section className="rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70">
          <p className="text-sm text-ink-soft">{t(config.count, { count: passedCount, total: snapshot.badges.length })}</p>
          <label htmlFor="arrival-search" className="mt-4 block text-sm font-medium">
            {t("manualLabel")}
          </label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
            <Input
              id="arrival-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("manualPlaceholder")}
              className="pl-10"
              autoComplete="off"
            />
          </div>
          {matches.length > 0 && (
            <ul className="mt-3 divide-y divide-line" aria-label={t("matchesLabel")}>
              {matches.map((badge) => {
                const at = passages[badge.studentId];
                return (
                  <li key={badge.studentId} className="flex items-center gap-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">
                        {badge.firstName} {badge.lastName}
                      </span>
                      <span className="block text-xs text-muted-foreground">{badge.className}</span>
                    </span>
                    {at ? (
                      <span className="text-xs font-medium text-success-700">{t(config.doneAt, { time: formatTime(at) })}</span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          void checkIn(badge, "manual");
                          setQuery("");
                        }}
                        aria-label={t(mode === "arrival" ? "checkInName" : "checkOutName", {
                          name: `${badge.firstName} ${badge.lastName}`,
                        })}
                      >
                        {t("checkIn")}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70" aria-labelledby="arrivals-recent">
          <h2 id="arrivals-recent" className="text-lg font-semibold">
            {t("recentTitle")}
          </h2>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{t(config.recentEmpty)}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line" aria-label={t("recentTitle")}>
              {recent.map(({ badge, at }) => (
                <li key={badge.studentId} className="flex items-center gap-3 py-2">
                  <span className="w-14 shrink-0 text-sm font-semibold text-ink tabular-nums">{formatTime(at)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {badge.firstName} {badge.lastName}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{badge.className}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function FeedbackBanner({ feedback }: { feedback: Feedback }) {
  const t = useTranslations("arrivals");
  if (feedback.kind === "unknown") {
    return (
      <p className="flex items-center gap-3 rounded-xl bg-danger-50 p-4 font-semibold text-danger-700 shadow-lg">
        <CircleAlert className="size-6 shrink-0" aria-hidden />
        {t("unknownCard")}
      </p>
    );
  }
  const name = `${feedback.badge.firstName} ${feedback.badge.lastName}`;
  const done = feedback.kind === "done";
  const Icon = done ? CircleCheck : Clock;
  const labels = MODES[feedback.mode];
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl p-4 shadow-lg",
        done ? "bg-success-50 text-success-700" : "bg-warning-50 text-warning-700",
      )}
    >
      <Icon className="size-7 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="truncate text-lg font-bold text-ink">{name}</p>
        <p className="text-sm font-medium">
          {feedback.badge.className} · {t(done ? labels.doneAt : labels.alreadyAt, { time: formatTime(feedback.at) })}
        </p>
      </div>
    </div>
  );
}
