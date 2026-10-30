import type { Instrumentation } from "next";
import { sentryDsn, sentryOptions } from "@/lib/monitoring";

/** Démarre Sentry sur le serveur (Node ou edge) quand un DSN est fourni. */
export async function register() {
  if (!sentryDsn) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init(sentryOptions());
}

/** Erreurs des rendus serveur, routes, actions et du proxy. */
export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!sentryDsn) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
};
