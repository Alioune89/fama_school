import type { InvoiceStatus } from "./fees";

/** Facture vue par le suivi des encaissements (montants en francs CFA). */
export type CollectionInvoice = {
  studentId: string;
  /** Premier jour du mois facturé ; null : frais annuels. */
  billingMonth: string | null;
  dueOn: string;
  total: number;
  amountPaid: number;
  status: InvoiceStatus;
};

export type CollectionColumn = { key: string | "annual"; billed: number; collected: number; remaining: number };

export type CollectionSummary = {
  billed: number;
  collected: number;
  remaining: number;
  /** Reste dû des factures échues. */
  overdue: number;
  overdueStudents: number;
  /** Part encaissée du facturé, de 0 à 1 ; null sans facture. */
  rate: number | null;
  /** Frais annuels d'abord, puis chaque mois facturé (« 2026-10 »), dans l'ordre de l'année. */
  columns: CollectionColumn[];
};

const paidPart = (invoice: CollectionInvoice) => Math.min(invoice.amountPaid, invoice.total);
const isOverdue = (invoice: CollectionInvoice, today: string) =>
  invoice.status !== "cancelled" && invoice.amountPaid < invoice.total && invoice.dueOn < today;

/** Facturé, encaissé, reste et retard de l'année, au total et par mois facturé (factures annulées exclues). */
export function summarizeCollections(invoices: CollectionInvoice[], months: string[], today: string): CollectionSummary {
  const live = invoices.filter((invoice) => invoice.status !== "cancelled");
  const columns = new Map<string, CollectionColumn>([["annual", { key: "annual", billed: 0, collected: 0, remaining: 0 }]]);
  for (const month of months) columns.set(month, { key: month, billed: 0, collected: 0, remaining: 0 });

  const overdueStudents = new Set<string>();
  let overdue = 0;
  for (const invoice of live) {
    const key = invoice.billingMonth?.slice(0, 7) ?? "annual";
    const column = columns.get(key) ?? { key, billed: 0, collected: 0, remaining: 0 };
    column.billed += invoice.total;
    column.collected += paidPart(invoice);
    column.remaining += invoice.total - paidPart(invoice);
    columns.set(key, column);
    if (isOverdue(invoice, today)) {
      overdue += invoice.total - invoice.amountPaid;
      overdueStudents.add(invoice.studentId);
    }
  }

  const billed = live.reduce((sum, invoice) => sum + invoice.total, 0);
  const collected = live.reduce((sum, invoice) => sum + paidPart(invoice), 0);
  return {
    billed,
    collected,
    remaining: billed - collected,
    overdue,
    overdueStudents: overdueStudents.size,
    rate: billed > 0 ? collected / billed : null,
    columns: [...columns.values()].filter((column) => column.key !== "annual" || column.billed > 0),
  };
}

export type OverdueStudent = {
  studentId: string;
  /** Reste dû des factures échues. */
  overdue: number;
  invoiceCount: number;
  /** Échéance la plus ancienne non réglée. */
  oldestDueOn: string;
  daysLate: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Élèves en retard de paiement, du plus ancien retard au plus récent. */
export function overdueByStudent(invoices: CollectionInvoice[], today: string): OverdueStudent[] {
  const byStudent = new Map<string, OverdueStudent>();
  for (const invoice of invoices) {
    if (!isOverdue(invoice, today)) continue;
    const current = byStudent.get(invoice.studentId);
    const oldestDueOn = current && current.oldestDueOn < invoice.dueOn ? current.oldestDueOn : invoice.dueOn;
    byStudent.set(invoice.studentId, {
      studentId: invoice.studentId,
      overdue: (current?.overdue ?? 0) + invoice.total - invoice.amountPaid,
      invoiceCount: (current?.invoiceCount ?? 0) + 1,
      oldestDueOn,
      daysLate: Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${oldestDueOn}T00:00:00Z`)) / DAY_MS),
    });
  }
  return [...byStudent.values()].sort((a, b) => a.oldestDueOn.localeCompare(b.oldestDueOn) || b.overdue - a.overdue);
}

/** Numéro pour un lien wa.me : chiffres seuls, indicatif compris (« +221 77 000 00 01 » → « 221770000001 »). */
export function whatsappNumber(phone: string | null): string | null {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (digits.length === 9) return `221${digits}`;
  return digits.length >= 11 ? digits : null;
}
