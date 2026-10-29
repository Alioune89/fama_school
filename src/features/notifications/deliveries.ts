import "server-only";
import { routing, type Locale } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeChannelProvider, type Channel } from "./channels";
import { renderNotification, type NotificationParams } from "./render";

type Claimed = {
  id: string;
  channel: Channel;
  to: string;
  kind: string;
  params: NotificationParams;
  link: string | null;
  locale: string;
};

/** Adresse publique de l'application, pour le lien des SMS. */
const appUrl = () => (process.env.APP_URL ?? "https://fama-school.vercel.app").replace(/\/$/, "");

/** Texte d'un SMS ou WhatsApp : « Fama School · titre », le détail, puis le lien vers la page concernée. */
async function compose(delivery: Claimed) {
  const locale: Locale = (routing.locales as readonly string[]).includes(delivery.locale) ? (delivery.locale as Locale) : "fr";
  const { title, body } = await renderNotification(delivery.kind, delivery.params, locale);
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return [`Fama School · ${title}`, body, delivery.link ? `${appUrl()}${prefix}${delivery.link}` : null]
    .filter(Boolean)
    .join("\n");
}

let lastRun = 0;

/**
 * Traite la file d'envoi : au plus une fois toutes les 10 secondes par serveur, appelé après chaque page de
 * l'application (et chaque jour par la tâche planifiée). Sans fournisseur configuré, ne fait rien.
 */
export async function processDeliveries({ force = false } = {}) {
  const provider = activeChannelProvider();
  if (!provider || !process.env.SUPABASE_SECRET_KEY) return { sent: 0, failed: 0 };
  if (!force && Date.now() - lastRun < 10_000) return { sent: 0, failed: 0 };
  lastRun = Date.now();

  const admin = createAdminClient();
  await admin.rpc("release_stuck_deliveries");
  const { data, error } = await admin.rpc("claim_deliveries", { p_limit: 20 });
  if (error) throw error;
  let sent = 0;
  let failed = 0;
  for (const delivery of (data ?? []) as Claimed[]) {
    const result = await provider.send(delivery.channel, delivery.to, await compose(delivery));
    await admin.rpc("finish_delivery", {
      p_id: delivery.id,
      p_ok: result.ok,
      p_provider_id: result.ok ? result.providerId : undefined,
      p_error: result.ok ? undefined : result.error,
    });
    if (result.ok) sent++;
    else failed++;
  }
  return { sent, failed };
}
