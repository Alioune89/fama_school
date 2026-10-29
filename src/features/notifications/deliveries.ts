import "server-only";
import { routing, type Locale } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeChannelProvider, type Channel } from "./channels";
import { pushConfigured, sendPush } from "./push";
import { renderNotification, type NotificationParams } from "./render";

type Claimed = {
  id: string;
  channel: Channel | "push";
  to: string | null;
  userId: string;
  kind: string;
  params: NotificationParams;
  link: string | null;
  locale: string;
};

/** Adresse publique de l'application, pour le lien des SMS. */
const appUrl = () => (process.env.APP_URL ?? "https://fama-school.vercel.app").replace(/\/$/, "");

/** Titre, détail et lien (dans la langue du destinataire) d'une notification à envoyer. */
async function render(delivery: Claimed) {
  const locale: Locale = (routing.locales as readonly string[]).includes(delivery.locale) ? (delivery.locale as Locale) : "fr";
  const { title, body } = await renderNotification(delivery.kind, delivery.params, locale);
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return { title, body, path: `${prefix}${delivery.link ?? ""}` || "/" };
}

/** Texte d'un SMS ou WhatsApp : « Fama School · titre », le détail, puis le lien vers la page concernée. */
async function compose(delivery: Claimed) {
  const { title, body, path } = await render(delivery);
  return [`Fama School · ${title}`, body, delivery.link ? `${appUrl()}${path}` : null].filter(Boolean).join("\n");
}

/** Envoi d'une notification : push vers les appareils du compte, sinon SMS ou WhatsApp vers son numéro. */
async function send(delivery: Claimed) {
  if (delivery.channel === "push") {
    const { title, body, path } = await render(delivery);
    return sendPush(delivery.userId, { title, body, url: path, tag: delivery.id });
  }
  return activeChannelProvider()!.send(delivery.channel, delivery.to!, await compose(delivery));
}

let lastRun = 0;

/**
 * Traite la file d'envoi : au plus une fois toutes les 10 secondes par serveur, appelé après chaque page de
 * l'application (et chaque jour par la tâche planifiée). Sans fournisseur configuré, ne fait rien.
 */
export async function processDeliveries({ force = false } = {}) {
  // Canaux ouverts : SMS et WhatsApp avec un fournisseur, push avec des clés VAPID.
  const channels = [...(activeChannelProvider() ? ["sms", "whatsapp"] : []), ...(pushConfigured() ? ["push"] : [])];
  if (channels.length === 0 || !process.env.SUPABASE_SECRET_KEY) return { sent: 0, failed: 0 };
  if (!force && Date.now() - lastRun < 10_000) return { sent: 0, failed: 0 };
  lastRun = Date.now();

  const admin = createAdminClient();
  await admin.rpc("release_stuck_deliveries");
  const { data, error } = await admin.rpc("claim_deliveries", { p_limit: 20, p_channels: channels });
  if (error) throw error;
  let sent = 0;
  let failed = 0;
  for (const delivery of (data ?? []) as Claimed[]) {
    const result = await send(delivery);
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
