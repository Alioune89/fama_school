/**
 * Règles des frais de scolarité, sans dépendance au navigateur ni à la base (testées dans fees.test.ts) :
 *
 * - une année compte un nombre de mensualités (9 par défaut, d'octobre à juin) à partir du mois de la rentrée ;
 * - les frais « une fois » (inscription, tenue, APE) sont dus une seule fois dans l'année ;
 * - les frais optionnels (cantine, transport) ne sont dus que par les élèves qui les ont choisis ;
 * - une réduction est un pourcentage, sur un frais précis ou sur toutes les mensualités ;
 *   une réduction sur un frais précis l'emporte sur celle des mensualités ;
 * - montants en francs CFA entiers : une remise est arrondie au franc le plus proche.
 */

export type FeeFrequency = "once" | "monthly";
export type BillingSchedule = { installments: number; firstMonth: string };

/** Calendrier par défaut : 9 mensualités à partir du mois de la rentrée. */
export function defaultSchedule(yearStartsOn: string): BillingSchedule {
  return { installments: 9, firstMonth: `${yearStartsOn.slice(0, 7)}-01` };
}

/** Mois décalé : shiftMonth("2026-11", 2) → « 2027-01 ». */
export function shiftMonth(month: string, delta: number): string {
  const [year, index] = month.split("-").map(Number) as [number, number];
  const value = year * 12 + (index - 1) + delta;
  return `${Math.floor(value / 12)}-${String((value % 12) + 1).padStart(2, "0")}`;
}

/** Mois facturés, au format « 2026-10 ». */
export function billingMonths({ installments, firstMonth }: BillingSchedule): string[] {
  return Array.from({ length: installments }, (_, index) => shiftMonth(firstMonth.slice(0, 7), index));
}

/** Montant après réduction, arrondi au franc. */
export function discounted(amount: number, percent: number): number {
  return Math.round((amount * (100 - percent)) / 100);
}

export type FeeRate = { feeTypeId: string; amount: number; frequency: FeeFrequency; optional: boolean };
export type Discount = { feeTypeId: string | null; percent: number };

/** Réduction applicable à un frais : la sienne, sinon celle des mensualités pour un frais mensuel. */
export function discountFor(rate: Pick<FeeRate, "feeTypeId" | "frequency">, discounts: readonly Discount[]): number {
  const own = discounts.find((d) => d.feeTypeId === rate.feeTypeId);
  if (own) return own.percent;
  if (rate.frequency === "monthly") return discounts.find((d) => d.feeTypeId === null)?.percent ?? 0;
  return 0;
}

export type AnnualLine = {
  feeTypeId: string;
  /** Montant d'une échéance, après réduction. */
  amount: number;
  occurrences: number;
  discountPercent: number;
  total: number;
};

/** Frais d'un élève sur l'année : une ligne par frais dû, et le total. */
export function annualFees(
  rates: readonly FeeRate[],
  installments: number,
  options: ReadonlySet<string>,
  discounts: readonly Discount[],
): { lines: AnnualLine[]; total: number } {
  const lines = rates
    .filter((rate) => rate.amount > 0 && (!rate.optional || options.has(rate.feeTypeId)))
    .map((rate) => {
      const discountPercent = discountFor(rate, discounts);
      const amount = discounted(rate.amount, discountPercent);
      const occurrences = rate.frequency === "monthly" ? installments : 1;
      return { feeTypeId: rate.feeTypeId, amount, occurrences, discountPercent, total: amount * occurrences };
    });
  return { lines, total: lines.reduce((sum, line) => sum + line.total, 0) };
}
