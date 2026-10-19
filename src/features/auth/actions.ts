"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { ACTIVE_SCHOOL_COOKIE, getCurrentUser } from "@/lib/auth/session";
import { SPACE_HOME, type Space } from "@/lib/auth/spaces";
import { normalizePhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { mapAuthError, safeNextPath, type ActionResult } from "./errors";

const localeSchema = z.enum(routing.locales).catch(routing.defaultLocale);

/** Étape 1 de la connexion par téléphone : envoi du code par SMS. */
export async function sendPhoneCode(input: { phone: string }): Promise<ActionResult<{ phone: string }>> {
  const phone = normalizePhone(input.phone ?? "");
  if (!phone) return { ok: false, error: "invalidPhone" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone, options: { channel: "sms" } });
  if (error) return { ok: false, error: mapAuthError(error) };
  return { ok: true, data: { phone } };
}

/** Étape 2 : vérification du code, puis ouverture de l'espace. */
export async function verifyPhoneCode(input: {
  phone: string;
  code: string;
  next?: string | null;
  locale: Locale;
}): Promise<ActionResult> {
  const phone = normalizePhone(input.phone ?? "");
  if (!phone) return { ok: false, error: "invalidPhone" };
  if (!/^\d{6}$/.test(input.code ?? "")) return { ok: false, error: "invalidCode" };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ phone, token: input.code, type: "sms" });
  if (error) return { ok: false, error: mapAuthError(error) };

  redirect({ href: safeNextPath(input.next) ?? "/choisir-espace", locale: localeSchema.parse(input.locale) });
  return { ok: true, data: undefined };
}

const emailSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

/** Connexion du personnel par e-mail et mot de passe. */
export async function signInWithEmail(input: {
  email: string;
  password: string;
  next?: string | null;
  locale: Locale;
}): Promise<ActionResult> {
  const parsed = emailSchema.safeParse({ email: input.email?.trim().toLowerCase(), password: input.password });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { ok: false, error: field === "password" ? "passwordRequired" : "invalidEmail" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: mapAuthError(error) };

  redirect({ href: safeNextPath(input.next) ?? "/choisir-espace", locale: localeSchema.parse(input.locale) });
  return { ok: true, data: undefined };
}

export async function signOut(locale: Locale): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(ACTIVE_SCHOOL_COOKIE);
  redirect({ href: "/connexion", locale: localeSchema.parse(locale) });
}

const enterSpaceSchema = z.object({
  space: z.enum(["direction", "professeur", "parent", "plateforme"]),
  schoolId: z.uuid().nullable(),
  locale: localeSchema,
});

/** Ouvre un espace ; mémorise l'école active pour la direction et les professeurs. */
export async function enterSpace(input: { space: Space; schoolId: string | null; locale: Locale }): Promise<void> {
  const { space, schoolId, locale } = enterSpaceSchema.parse(input);
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/connexion", locale });

  const allowed = user!.spaces.some((entry) => entry.space === space && (schoolId === null || entry.schoolId === schoolId));
  if (!allowed) redirect({ href: "/choisir-espace", locale });

  if (schoolId) {
    (await cookies()).set(ACTIVE_SCHOOL_COOKIE, schoolId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  redirect({ href: SPACE_HOME[space], locale });
}
