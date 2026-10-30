/**
 * Suivi des erreurs (Sentry). Fermé tant que NEXT_PUBLIC_SENTRY_DSN est vide : le SDK n'est alors jamais chargé,
 * ni sur le serveur ni dans le navigateur. Aucune donnée personnelle n'est envoyée (cookies, en-têtes, corps, variables).
 */
import type { BrowserOptions } from "@sentry/nextjs";

export const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

/** Réglages communs au serveur, à l'edge et au navigateur. */
export function sentryOptions(): BrowserOptions {
  return {
    dsn: sentryDsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    // Données d'élèves et de parents : rien d'autre que l'erreur et sa pile ne quitte l'application.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
    },
  };
}

/** Signale une erreur attrapée par une page d'erreur (sans effet sans DSN). */
export function reportError(error: unknown) {
  if (!sentryDsn) return;
  void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error)).catch(() => {});
}
