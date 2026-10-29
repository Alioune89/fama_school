"use client";

import { lazy, Suspense } from "react";

/**
 * Indicateur des saisies hors ligne, chargé à la demande : le moteur hors ligne (Dexie, schémas des opérations)
 * n'est téléchargé que dans les espaces qui l'affichent (direction, professeur), pas chez les parents ni sur
 * les pages publiques.
 */
const SyncIndicatorPanel = lazy(() => import("./sync-indicator-panel").then((module) => ({ default: module.SyncIndicator })));

export function SyncIndicator({ userId }: { userId: string }) {
  return (
    <Suspense fallback={null}>
      <SyncIndicatorPanel userId={userId} />
    </Suspense>
  );
}
