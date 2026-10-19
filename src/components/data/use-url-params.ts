"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * Dernière requête demandée et pas encore reflétée par l'URL. Recherche et filtres partent de là :
 * sinon, sur un réseau lent, chacun repart des anciens paramètres et le dernier arrivé efface l'autre.
 */
let pending: { pathname: string; query: string } | null = null;

/** Met à jour un ou plusieurs paramètres de l'URL (la pagination repart de zéro). */
export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pending && (pending.pathname !== pathname || pending.query === searchParams.toString())) pending = null;
  }, [pathname, searchParams]);

  return (changes: Record<string, string | null>) => {
    const base = pending?.pathname === pathname ? pending.query : searchParams.toString();
    const params = new URLSearchParams(base);
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    pending = { pathname, query: params.toString() };
    router.replace({ pathname, query: Object.fromEntries(params.entries()) }, { scroll: false });
  };
}
