"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";

/**
 * Cloche en temps réel : à chaque notification qui arrive pour ce compte (Supabase Realtime, filtré par la RLS),
 * la page se rafraîchit (pastille, liste, page ouverte) et un message bref s'affiche. Revenir sur l'application
 * (onglet ou téléphone remis au premier plan) rafraîchit aussi, au cas où la connexion serait tombée entre-temps.
 */
export function useLiveNotifications(userId: string) {
  const t = useTranslations("notifications");
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Une émission de factures peut en créer plusieurs à la suite : un seul rafraîchissement.
    const refreshSoon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };

    // Le client Supabase (temps réel) se charge après l'affichage de la page, pas avant.
    let cancelled = false;
    let unsubscribe = () => {};
    void import("@/lib/supabase/client").then(({ createClient }) => {
      if (cancelled) return;
      const supabase = createClient();
      const channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          () => {
            toast(t("live"));
            refreshSoon();
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          refreshSoon,
        )
        .subscribe();
      unsubscribe = () => void supabase.removeChannel(channel);
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshSoon();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      cancelled = true;
      unsubscribe();
    };
  }, [userId, router, t]);
}
