import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";

export const DEFAULT_COUNTRY: CountryCode = "SN";

/**
 * Normalise une saisie libre (« 77 123 45 67 », « 0021777… », « +221 77… ») au format E.164.
 * Retourne null si le numéro n'est pas valide.
 */
export function normalizePhone(input: string, country: CountryCode = DEFAULT_COUNTRY): string | null {
  const cleaned = input.trim().replace(/^00/, "+");
  if (!cleaned) return null;
  const parsed = parsePhoneNumberFromString(cleaned, country);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

/** Affichage lisible : +221 77 123 45 67. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatInternational() : e164;
}

/** Supabase Auth attend le numéro sans « + » pour les codes de test, mais accepte E.164 pour l'envoi. */
export function toAuthPhone(e164: string): string {
  return e164.replace(/^\+/, "");
}
