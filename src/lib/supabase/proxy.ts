import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "./env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export type SessionRefresh = {
  userId: string | null;
  /** Reporte les cookies rafraîchis et les en-têtes anti-cache sur la réponse finale. */
  applyTo: (response: NextResponse) => NextResponse;
};

/**
 * Rafraîchit la session Supabase pendant le proxy.
 * Les cookies de la requête sont mis à jour sur place : les réécritures next-intl recopient
 * les en-têtes de la requête, donc les Server Components voient la session rafraîchie.
 */
export async function refreshSession(request: NextRequest): Promise<SessionRefresh> {
  const pendingCookies: CookieToSet[] = [];
  const pendingHeaders: Record<string, string> = {};
  const applyTo = (response: NextResponse) => {
    for (const { name, value, options } of pendingCookies) response.cookies.set(name, value, options);
    for (const [key, value] of Object.entries(pendingHeaders)) response.headers.set(key, value);
    return response;
  };

  let env: ReturnType<typeof getSupabaseEnv>;
  try {
    env = getSupabaseEnv();
  } catch (error) {
    // Sans configuration Supabase, les pages publiques restent consultables (aperçu du design, build).
    console.warn(String(error));
    return { userId: null, applyTo };
  }

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie.name, cookie.value);
          pendingCookies.push(cookie);
        }
        Object.assign(pendingHeaders, headers);
      },
    },
  });

  try {
    // Doit être appelé avant toute réponse : c'est ce qui déclenche le rafraîchissement du jeton.
    const { data } = await supabase.auth.getClaims();
    return { userId: data?.claims?.sub ?? null, applyTo };
  } catch (error) {
    // Service d'authentification injoignable : on traite la requête comme anonyme plutôt que d'échouer.
    console.error("Rafraîchissement de session impossible :", error);
    return { userId: null, applyTo };
  }
}
