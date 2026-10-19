import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

/** Client Supabase côté serveur, au nom de l'utilisateur connecté (RLS appliquée). Un client par requête. */
export async function createClient() {
  // Les données scolaires sont toujours lues à la requête : jamais figées dans un prérendu ni un préchargement.
  // (La vérification de session de supabase-js utilise aussi Date.now(), interdit pendant un prérendu.)
  await connection();
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appel depuis un Server Component : impossible d'écrire les cookies ici,
          // le proxy (src/proxy.ts) rafraîchit déjà la session à chaque navigation.
        }
      },
    },
  });
}
