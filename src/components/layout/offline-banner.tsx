"use client";

import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOffline } from "next/offline";

/** Bandeau global : la connexion est tombée, les actions partiront au retour du réseau. */
export function OfflineBanner() {
  const t = useTranslations("offline");
  const isOffline = useOffline();
  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-sun-200 px-4 py-2 text-center text-sm font-medium text-ink"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      {t("banner")}
    </div>
  );
}
