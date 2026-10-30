"use server";

import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { CONTACT } from "@/config/contact";
import { activeChannelProvider } from "@/features/notifications/channels";
import { routing } from "@/i18n/routing";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { formatPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { demoRequestSchema, type DemoRequestInput } from "./schemas";

/** Demande de démo déposée par un visiteur ; l'équipe Fama School la retrouve dans l'espace plateforme. */
export async function submitDemoRequest(input: DemoRequestInput): Promise<ActionResult> {
  const parsed = demoRequestSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  // Un robot remplit le champ piège : on lui répond comme à tout le monde, sans rien enregistrer.
  if (v.website) return ok(undefined);

  const supabase = await createClient();
  const { error } = await supabase.from("demo_requests").insert({
    full_name: v.fullName,
    school_name: v.schoolName,
    role: v.role,
    phone: v.phone,
    email: v.email,
    city: v.city,
    students_range: v.studentsRange,
    message: v.message,
  });
  if (error)
    return fail(error.code === "P0001" && error.message === "tooManyRequests" ? "landing.demo.tooMany" : "errors.unknown");
  await alertTeam(v.fullName, v.schoolName, v.phone);
  return ok(undefined);
}

/**
 * Prévient l'équipe Fama School par SMS (TEAM_ALERT_PHONE, sinon le numéro de contact) dès qu'une demande
 * arrive, pour rappeler l'école le jour même. Sans fournisseur d'envoi (NOTIFICATION_CHANNELS), rien ne part.
 */
async function alertTeam(name: string, school: string, phone: string) {
  const provider = activeChannelProvider();
  if (!provider) return;
  const to = process.env.TEAM_ALERT_PHONE || CONTACT.whatsapp;
  // Hors d'une page, la langue n'est pas connue : l'alerte part dans la langue par défaut.
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "landing.demo" });
  const text = t("teamAlert", { name, school, phone: formatPhone(phone) });
  after(async () => {
    const result = await provider.send("sms", to, text);
    if (!result.ok) console.error(`Demande de démo de ${school} : alerte non envoyée (${result.error})`);
  });
}
