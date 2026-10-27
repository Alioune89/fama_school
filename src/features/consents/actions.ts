"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { getCurrentUser } from "@/lib/auth/session";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { CONSENT_VERSION } from "./consents";

const consentsSchema = z.object({
  data: z.literal(true, { error: "consents.errors.dataRequired" }),
  photos: z.boolean(),
  location: z.boolean(),
  locale: z.enum(routing.locales),
});

/** Enregistre les consentements du compte connecté (version actuelle des textes) et sa langue. */
export async function saveConsents(input: z.input<typeof consentsSchema>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("errors.forbidden");
  const parsed = consentsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { locale, ...consents } = parsed.data;

  const supabase = await createClient();
  const decidedAt = new Date().toISOString();
  const [consentResult, profileResult] = await Promise.all([
    supabase.from("user_consents").upsert(
      Object.entries(consents).map(([kind, granted]) => ({
        user_id: user.id,
        kind,
        granted,
        policy_version: CONSENT_VERSION,
        decided_at: decidedAt,
      })),
    ),
    supabase.from("profiles").update({ locale }).eq("id", user.id),
  ]);
  if (consentResult.error || profileResult.error) return fail("errors.unknown");
  refresh();
  return ok(undefined);
}
