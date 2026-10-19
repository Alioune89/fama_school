import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

/**
 * Client « service » qui contourne la RLS. Réservé aux invitations, webhooks de paiement et tâches planifiées,
 * toujours après une vérification explicite des droits de l'appelant.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Variable SUPABASE_SECRET_KEY manquante (voir .env.example).");
  }
  const { url } = getSupabaseEnv();
  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
