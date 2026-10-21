"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOffline } from "next/offline";
import { offlineDb, type Draft } from "@/lib/offline/db";
import type { RollCallData } from "../queries";
import { defaultSlot } from "../roll-call";
import { RollCallBoard, rollCallSnapshotKey } from "./roll-call-board";

/**
 * Affiché pendant le chargement de l'appel. Sans réseau, le chargement attend indéfiniment :
 * on reprend alors la liste gardée sur le téléphone à la dernière ouverture de la classe.
 */
export function RollCallFallback() {
  const t = useTranslations("attendance.rollCall");
  const isOffline = useOffline();
  const [snapshot, setSnapshot] = useState<Draft | null | undefined>(undefined);

  useEffect(() => {
    // L'identifiant de la classe est lu dans l'adresse : ce composant fait partie de la coquille préchargée.
    const classId = window.location.pathname.split("/").filter(Boolean).at(-1) ?? "";
    void offlineDb()
      .drafts.get(rollCallSnapshotKey(classId))
      .then((row) => setSnapshot(row ?? null));
  }, []);

  if (isOffline && snapshot) {
    return <RollCallBoard userId={snapshot.userId} data={snapshot.data as RollCallData} initialSlot={defaultSlot()} fromCache />;
  }

  return (
    <div className="space-y-3" aria-busy>
      {isOffline && (
        <p className="flex items-start gap-2 rounded-xl bg-sun-200/60 p-4 text-sm text-ink">
          <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("waiting")}
        </p>
      )}
      <div className="h-24 animate-pulse rounded-xl bg-white shadow-card" />
      <div className="h-96 animate-pulse rounded-xl bg-white shadow-card" />
    </div>
  );
}
