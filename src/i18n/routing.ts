import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "wo"],
  defaultLocale: "fr",
  // Le français n'a pas de préfixe (/direction), le wolof si (/wo/direction).
  localePrefix: "as-needed",
  localeCookie: {
    name: "FAMA_LOCALE",
    maxAge: 60 * 60 * 24 * 365,
  },
});

export type Locale = (typeof routing.locales)[number];
