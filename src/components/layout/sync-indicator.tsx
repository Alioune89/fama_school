"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CircleAlert, CloudCheck, CloudUpload, LoaderCircle, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMessage } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { offlineDb } from "@/lib/offline/db";
import { dismissRejected, flushOutbox, OUTBOX_EVENT, pruneDrafts, syncStore } from "@/lib/offline/outbox";
import { cn } from "@/lib/utils";

const RETRY_INTERVAL_MS = 30_000;
const pill =
  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap shadow-card ring-1 transition-colors";

/** Envoie la file au bon moment : ouverture, retour du réseau, retour au premier plan, nouvelle saisie, et toutes les 30 s. */
function useSyncTriggers(userId: string) {
  useEffect(() => {
    const flush = () => void flushOutbox(userId);
    const onVisible = () => document.visibilityState === "visible" && flush();
    flush();
    void pruneDrafts();
    window.addEventListener("online", flush);
    window.addEventListener(OUTBOX_EVENT, flush);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(flush, RETRY_INTERVAL_MS);
    return () => {
      window.removeEventListener("online", flush);
      window.removeEventListener(OUTBOX_EVENT, flush);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [userId]);
}

/**
 * État des saisies faites hors ligne : « 3 en attente » pendant l'envoi, « Synchronisé » quelques
 * secondes une fois tout parti, et les envois refusés (droits, élève retiré…) à consulter.
 */
export function SyncIndicator({ userId }: { userId: string }) {
  const t = useTranslations("sync");
  const message = useMessage();
  useSyncTriggers(userId);

  const { syncing, problem } = useSyncExternalStore(syncStore.subscribe, syncStore.get, syncStore.get);
  const pending = useLiveQuery(() => offlineDb().outbox.where("[userId+state]").equals([userId, "pending"]).count(), [userId]);
  const rejected = useLiveQuery(
    () => offlineDb().outbox.where("[userId+state]").equals([userId, "rejected"]).sortBy("createdAt"),
    [userId],
  );

  // « Synchronisé » s'affiche brièvement quand la file vient de se vider.
  const [justSynced, setJustSynced] = useState(false);
  const previousPending = useRef(0);
  useEffect(() => {
    if (pending === undefined) return;
    const emptied = previousPending.current > 0 && pending === 0;
    previousPending.current = pending;
    if (!emptied) return;
    setJustSynced(true);
    const timer = window.setTimeout(() => setJustSynced(false), 4000);
    return () => window.clearTimeout(timer);
  }, [pending]);

  const [open, setOpen] = useState(false);

  if (rejected && rejected.length > 0) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(pill, "bg-danger-50 text-danger-700 ring-danger-500/25 hover:bg-danger-500/10")}
        >
          <CircleAlert className="size-4" aria-hidden />
          {t("rejected", { count: rejected.length })}
        </button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{t("rejectedTitle")}</SheetTitle>
              <SheetDescription>{t("rejectedHint")}</SheetDescription>
            </SheetHeader>
            <ul className="space-y-3 px-4">
              {rejected.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 rounded-xl bg-danger-50 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{entry.label}</p>
                    <p className="text-sm text-danger-700">{message(entry.error ?? "errors.unknown")}</p>
                  </div>
                  <Button variant="ghost" size="icon-sm" aria-label={t("dismiss")} onClick={() => void dismissRejected(entry.id)}>
                    <Trash2 aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  if (pending) {
    const Icon = syncing ? LoaderCircle : CloudUpload;
    return (
      <span
        role="status"
        title={problem ? t(`problem.${problem}`) : undefined}
        className={cn(pill, "bg-warning-50 text-warning-700 ring-warning-500/25")}
      >
        <Icon className={cn("size-4", syncing && "animate-spin")} aria-hidden />
        {t("pending", { count: pending })}
      </span>
    );
  }

  if (justSynced) {
    return (
      <span role="status" className={cn(pill, "bg-success-50 text-success-700 ring-success-500/25")}>
        <CloudCheck className="size-4" aria-hidden />
        <span className="max-sm:sr-only">{t("synced")}</span>
      </span>
    );
  }

  return null;
}
