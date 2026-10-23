"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOffline } from "next/offline";
import { offlineDb, type Draft } from "@/lib/offline/db";
import type { GradeSheetData } from "../queries";
import { SheetHeading } from "./sheet-heading";
import { GradeSheet, gradeSheetSnapshotKey } from "./grade-sheet";

/**
 * Affiché pendant le chargement de la feuille. Sans réseau, le chargement attend indéfiniment :
 * on reprend alors la feuille gardée sur le téléphone à la dernière ouverture de l'évaluation.
 */
export function GradeSheetFallback({ backHref }: { backHref: string }) {
  const t = useTranslations("grades");
  const isOffline = useOffline();
  const [snapshot, setSnapshot] = useState<Draft | null | undefined>(undefined);

  useEffect(() => {
    // L'identifiant de l'évaluation est lu dans l'adresse : ce composant fait partie de la coquille préchargée.
    const evaluationId = window.location.pathname.split("/").filter(Boolean).at(-1) ?? "";
    void offlineDb()
      .drafts.get(gradeSheetSnapshotKey(evaluationId))
      .then((row) => setSnapshot(row ?? null));
  }, []);

  if (isOffline && snapshot) {
    return (
      <>
        <SheetHeading backHref={backHref} />
        <GradeSheet userId={snapshot.userId} data={snapshot.data as GradeSheetData} editable fromCache />
      </>
    );
  }

  return (
    <>
      <SheetHeading backHref={backHref} />
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
    </>
  );
}
