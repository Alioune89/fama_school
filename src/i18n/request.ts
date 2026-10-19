import { hasLocale, type AbstractIntlMessages } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import * as rootParams from "next/root-params";
import { routing, type Locale } from "./routing";

type Messages = AbstractIntlMessages;

function isPlainObject(value: unknown): value is Messages {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Les traductions wolof sont partielles : toute clé absente retombe sur le français.
export function mergeMessages(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = result[key];
    result[key] = isPlainObject(current) && isPlainObject(value) ? mergeMessages(current, value) : value;
  }
  return result;
}

export async function loadMessages(locale: Locale): Promise<Messages> {
  const fr = (await import("../messages/fr.json")).default as Messages;
  if (locale === "fr") return fr;
  const wo = (await import("../messages/wo.json")).default as Messages;
  return mergeMessages(fr, wo);
}

export default getRequestConfig(async ({ locale: requested }) => {
  let locale: Locale = routing.defaultLocale;
  if (hasLocale(routing.locales, requested)) {
    locale = requested;
  } else {
    const fromParams = await rootParams.locale();
    if (hasLocale(routing.locales, fromParams)) locale = fromParams;
  }

  return {
    locale,
    messages: await loadMessages(locale),
    timeZone: "Africa/Dakar",
  };
});
