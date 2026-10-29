import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Notifications push (Web Push, clés VAPID) : NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY et VAPID_SUBJECT
 * (« mailto: » de contact). Sans clés, le push est fermé : les envois restent en file puis expirent.
 */
export function pushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:contact@famaschool.sn",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export type PushPayload = { title: string; body: string; url: string; tag: string };

/** Envoie à tous les appareils du compte ; un appareil désabonné (404, 410) est retiré. */
export async function sendPush(
  userId: string,
  payload: PushPayload,
): Promise<{ ok: true; providerId: string } | { ok: false; error: string }> {
  configure();
  const admin = createAdminClient();
  const { data: devices, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  if (!devices.length) return { ok: true, providerId: "PUSH-aucun-appareil" };

  const results = await Promise.all(
    devices.map(async (device) => {
      try {
        await webpush.sendNotification(
          { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
          JSON.stringify(payload),
          { TTL: 24 * 3600, urgency: "normal", timeout: 15_000 },
        );
        return "sent" as const;
      } catch (cause) {
        const status = (cause as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", device.id);
          return "removed" as const;
        }
        return `${status ?? ""} ${cause instanceof Error ? cause.message : "envoi push impossible"}`.trim();
      }
    }),
  );
  const delivered = results.filter((result) => result === "sent").length;
  const failure = results.find((result) => result !== "sent" && result !== "removed");
  // Aucun appareil joint alors qu'il en reste d'abonnés : échec, pour un nouvel essai.
  if (delivered === 0 && failure) return { ok: false, error: failure.slice(0, 300) };
  return { ok: true, providerId: `PUSH-${delivered}/${devices.length}` };
}
