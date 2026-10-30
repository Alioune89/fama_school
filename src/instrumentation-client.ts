import { sentryDsn, sentryOptions } from "@/lib/monitoring";

// Chargé après coup pour ne pas alourdir le premier affichage ; sans DSN, le SDK ne fait pas partie du bundle.
if (sentryDsn) {
  void import("@sentry/nextjs").then((Sentry) => Sentry.init(sentryOptions())).catch(() => {});
}
