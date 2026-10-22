"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOffline } from "next/offline";
import { offlineDb, type Draft } from "@/lib/offline/db";
import { ARRIVAL_SNAPSHOT_KEY, ArrivalScanner, type ArrivalSnapshot } from "./arrival-scanner";

/**
 * Affiché pendant le chargement du pointage. Sans réseau, le chargement attend indéfiniment :
 * on reprend alors les cartes gardées sur le téléphone à la dernière ouverture de la page.
 */
export function ArrivalScannerFallback() {
  const t = useTranslations("arrivals");
  const isOffline = useOffline();
  const [snapshot, setSnapshot] = useState<Draft | null | undefined>(undefined);

  useEffect(() => {
    void offlineDb()
      .drafts.get(ARRIVAL_SNAPSHOT_KEY)
      .then((row) => setSnapshot(row ?? null));
  }, []);

  if (isOffline && snapshot) {
    return <ArrivalScanner userId={snapshot.userId} snapshot={snapshot.data as ArrivalSnapshot} fromCache />;
  }

  return (
    <div className="space-y-3" aria-busy>
      {isOffline && (
        <p className="flex items-start gap-2 rounded-xl bg-sun-200/60 p-4 text-sm text-ink">
          <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("waiting")}
        </p>
      )}
      <div className="aspect-square max-w-md animate-pulse rounded-2xl bg-white shadow-card" />
    </div>
  );
}
