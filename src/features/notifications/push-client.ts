"use client";

import { removePushSubscription, savePushSubscription } from "./actions";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export type PushSupport = "ready" | "unconfigured" | "unsupported" | "denied";

/** Le push est-il possible ici ? (clé publique, navigateur, permission ; sur iPhone, application installée). */
export function pushSupport(): PushSupport {
  if (!publicKey) return "unconfigured";
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  )
    return "unsupported";
  return Notification.permission === "denied" ? "denied" : "ready";
}

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

/** Demande la permission puis abonne cet appareil ; false si le parent refuse ou si l'abonnement échoue. */
export async function enablePush(): Promise<boolean> {
  if (pushSupport() !== "ready") return false;
  if ((await Notification.requestPermission()) !== "granted") return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey!) }));
    const json = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    const result = await savePushSubscription({ ...json, userAgent: navigator.userAgent.slice(0, 300) });
    return result.ok;
  } catch {
    return false;
  }
}

/** Désabonne cet appareil (le réglage du compte est enregistré à part). */
export async function disablePush() {
  if (pushSupport() === "unconfigured" || pushSupport() === "unsupported") return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await removePushSubscription({ endpoint: subscription.endpoint });
  await subscription.unsubscribe();
}
