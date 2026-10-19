export const APP_TIME_ZONE = "Africa/Dakar";
export const APP_LOCALE_TAG = "fr-SN";

const integerFormatter = new Intl.NumberFormat(APP_LOCALE_TAG, { maximumFractionDigits: 0 });

/**
 * Montant en francs CFA, toujours entier (le franc CFA n'a pas de centimes en usage courant).
 * Ex. 125000 → « 125 000 FCFA ».
 */
export function formatXOF(amount: number | bigint): string {
  if (typeof amount === "number" && !Number.isInteger(amount)) {
    throw new RangeError(`Montant FCFA non entier : ${amount}`);
  }
  // Intl utilise une espace fine insécable comme séparateur de milliers en français.
  return `${integerFormatter.format(amount)} FCFA`;
}

/** Nombre entier avec séparateur de milliers (effectifs, compteurs). */
export function formatInteger(value: number | bigint): string {
  return integerFormatter.format(value);
}

export function formatDate(
  value: Date | string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" },
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(APP_LOCALE_TAG, { timeZone: APP_TIME_ZONE, ...options }).format(date);
}

/** Initiales pour les avatars sans photo : « Awa Diop » → « AD ». */
export function initials(fullName: string | null | undefined): string {
  if (!fullName) return "?";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}
