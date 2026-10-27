import "server-only";
import { cache } from "react";
import { SPACE_HOME, type Space } from "@/lib/auth/spaces";
import { createClient } from "@/lib/supabase/server";
import { CONSENT_KINDS, CONSENT_VERSION, type ConsentKind, type Consents } from "./consents";

/**
 * Consentements du compte connecté, pour la version actuelle des textes ; `decided` : l'utilisateur a accepté
 * le traitement des données (sans quoi l'espace parent le renvoie vers la page de bienvenue).
 */
export const getMyConsents = cache(async (userId: string): Promise<{ decided: boolean; consents: Consents }> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_consents").select("kind, granted, policy_version").eq("user_id", userId);
  if (error) throw error;
  const current = (data ?? []).filter((row) => row.policy_version === CONSENT_VERSION);
  const consents = Object.fromEntries(
    CONSENT_KINDS.map((kind) => [kind, current.some((row) => row.kind === kind && row.granted)]),
  ) as Record<ConsentKind, boolean>;
  return { decided: consents.data, consents };
});

/** Accueil d'un espace : la page de bienvenue tant qu'un parent n'a pas accepté le suivi scolaire. */
export async function spaceEntry(userId: string, space: Space): Promise<string> {
  if (space !== "parent") return SPACE_HOME[space];
  const { decided } = await getMyConsents(userId);
  return decided ? SPACE_HOME.parent : "/bienvenue";
}
