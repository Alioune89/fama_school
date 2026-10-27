import { describe, expect, it } from "vitest";
import { overdueByStudent, summarizeCollections, whatsappNumber, type CollectionInvoice } from "./collections";

const invoice = (overrides: Partial<CollectionInvoice>): CollectionInvoice => ({
  studentId: "a",
  billingMonth: "2026-10-01",
  dueOn: "2026-10-05",
  total: 25000,
  amountPaid: 0,
  status: "overdue",
  ...overrides,
});

describe("summarizeCollections", () => {
  const today = "2026-11-10";
  const invoices = [
    invoice({ studentId: "a", amountPaid: 25000, status: "paid" }),
    invoice({ studentId: "b", amountPaid: 10000, status: "partial" }),
    invoice({ studentId: "a", billingMonth: "2026-11-01", dueOn: "2026-11-05", amountPaid: 0 }),
    invoice({ studentId: "c", billingMonth: "2026-11-01", dueOn: "2026-11-15", status: "open" }),
    invoice({ studentId: "c", billingMonth: null, dueOn: "2026-10-05", total: 40000, amountPaid: 40000, status: "paid" }),
    invoice({ studentId: "d", status: "cancelled" }),
  ];
  const summary = summarizeCollections(invoices, ["2026-10", "2026-11", "2026-12"], today);

  it("totalise le facturé, l'encaissé et le reste, sans les factures annulées", () => {
    expect(summary).toMatchObject({ billed: 140000, collected: 75000, remaining: 65000 });
    expect(summary.rate).toBeCloseTo(75000 / 140000);
  });

  it("compte le retard : factures échues non soldées, et les élèves concernés", () => {
    // b : reste 15 000 (octobre) ; a : 25 000 (novembre, échu le 5) ; c : novembre pas encore échu.
    expect(summary.overdue).toBe(40000);
    expect(summary.overdueStudents).toBe(2);
  });

  it("répartit par mois facturé, frais annuels d'abord, mois sans facture compris", () => {
    expect(summary.columns).toEqual([
      { key: "annual", billed: 40000, collected: 40000, remaining: 0 },
      { key: "2026-10", billed: 50000, collected: 35000, remaining: 15000 },
      { key: "2026-11", billed: 50000, collected: 0, remaining: 50000 },
      { key: "2026-12", billed: 0, collected: 0, remaining: 0 },
    ]);
  });

  it("sans facture : pas de taux, pas de colonne annuelle", () => {
    const empty = summarizeCollections([], ["2026-10"], today);
    expect(empty.rate).toBeNull();
    expect(empty.columns).toEqual([{ key: "2026-10", billed: 0, collected: 0, remaining: 0 }]);
  });

  it("un trop-perçu ne gonfle pas l'encaissé", () => {
    expect(summarizeCollections([invoice({ amountPaid: 30000, status: "paid" })], [], today).collected).toBe(25000);
  });
});

describe("overdueByStudent", () => {
  it("regroupe par élève, du plus ancien retard au plus récent", () => {
    const list = overdueByStudent(
      [
        invoice({ studentId: "a", billingMonth: "2026-11-01", dueOn: "2026-11-05" }),
        invoice({ studentId: "b", amountPaid: 5000, status: "partial" }),
        invoice({ studentId: "a", dueOn: "2026-10-05" }),
        invoice({ studentId: "c", dueOn: "2026-11-20", status: "open" }),
      ],
      "2026-11-10",
    );
    expect(list).toEqual([
      { studentId: "a", overdue: 50000, invoiceCount: 2, oldestDueOn: "2026-10-05", daysLate: 36 },
      { studentId: "b", overdue: 20000, invoiceCount: 1, oldestDueOn: "2026-10-05", daysLate: 36 },
    ]);
  });
});

describe("whatsappNumber", () => {
  it("garde l'indicatif, ajoute +221 aux numéros sénégalais à 9 chiffres", () => {
    expect(whatsappNumber("+221 77 000 00 01")).toBe("221770000001");
    expect(whatsappNumber("77 000 00 01")).toBe("221770000001");
    expect(whatsappNumber("12")).toBeNull();
    expect(whatsappNumber(null)).toBeNull();
  });
});
