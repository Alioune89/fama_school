/**
 * Montant en toutes lettres, pour les reçus (« trente mille francs CFA »), selon l'orthographe traditionnelle :
 * traits d'union sous cent, « et » dans vingt et un… soixante et onze, « quatre-vingts » et « deux cents »
 * prennent un s quand ils terminent le nombre, « mille » est invariable, « million » s'accorde.
 * Testé dans amount-in-words.test.ts.
 */

// prettier-ignore
const UNITS = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf",
];
const TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];

/** 0 à 99. `final` : le nombre se termine ici (pour le s de « quatre-vingts »). */
function belowHundred(n: number, final: boolean): string {
  if (n < 20) return UNITS[n]!;
  if (n < 70) {
    const tens = TENS[Math.floor(n / 10)]!;
    const unit = n % 10;
    if (unit === 0) return tens;
    return unit === 1 ? `${tens} et un` : `${tens}-${UNITS[unit]}`;
  }
  if (n < 80) return n === 71 ? "soixante et onze" : `soixante-${UNITS[n - 60]}`;
  if (n === 80) return final ? "quatre-vingts" : "quatre-vingt";
  return `quatre-vingt-${UNITS[n - 80]}`;
}

/** 0 à 999. */
function belowThousand(n: number, final: boolean): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds === 0) return belowHundred(rest, final);
  const head = hundreds === 1 ? "cent" : `${UNITS[hundreds]} cent${rest === 0 && final ? "s" : ""}`;
  return rest === 0 ? head : `${head} ${belowHundred(rest, final)}`;
}

/** Entier positif ou nul en lettres (jusqu'à 999 999 999 999). */
export function numberInWords(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value >= 1e12) throw new RangeError(`Nombre non pris en charge : ${value}`);
  if (value === 0) return "zéro";
  const parts: string[] = [];
  const billions = Math.floor(value / 1e9);
  const millions = Math.floor((value % 1e9) / 1e6);
  const thousands = Math.floor((value % 1e6) / 1e3);
  const rest = value % 1e3;
  if (billions) parts.push(`${belowThousand(billions, false)} milliard${billions > 1 ? "s" : ""}`);
  if (millions) parts.push(`${belowThousand(millions, false)} million${millions > 1 ? "s" : ""}`);
  if (thousands) parts.push(thousands === 1 ? "mille" : `${belowThousand(thousands, false)} mille`);
  if (rest) parts.push(belowThousand(rest, true));
  return parts.join(" ");
}

/** « trente mille francs CFA » ; « un million de francs CFA » (million ou milliard en fin de nombre). */
export function amountInWords(amount: number): string {
  const of = amount >= 1e6 && amount % 1e6 === 0 ? " de" : "";
  return `${numberInWords(amount)}${of} franc${amount > 1 ? "s" : ""} CFA`;
}
