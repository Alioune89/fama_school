"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Cloche en temps réel : à chaque notification qui arrive pour ce compte (Supabase Realtime, filtré par la RLS),
 * onArrive est appelé et la page se rafraîchit (pastille, liste, page ouverte). Revenir sur
 * l'application (onglet ou téléphone remis au premier plan) rafraîchit aussi, au cas où la connexion serait
 * tombée entre-temps.
 */
export function useLiveNotifications(userId: string, onArrive: () => void) {
  const router = useRouter();
  const arrive = useRef(onArrive);
  useEffect(() => {
    arrive.current = onArrive;
  });

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
    void import("@/lib/supabase/client").then(async ({ createClient }) => {
      if (cancelled) return;
      const supabase = createClient();
      // Le temps réel filtre par la RLS : il lui faut la session du compte avant l'abonnement, sinon rien n'arrive.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      const channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          () => {
            arrive.current();
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
  }, [userId, router]);
}
