import { describe, expect, it } from "vitest";
import {
  annualFees,
  billingMonths,
  defaultSchedule,
  discounted,
  discountFor,
  invoiceStatus,
  shiftMonth,
  type FeeRate,
} from "./fees";

describe("billingMonths", () => {
  it("9 mensualités d'octobre à juin, à cheval sur deux années civiles", () => {
    expect(billingMonths(defaultSchedule("2026-10-05"))).toEqual([
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
      "2027-03",
      "2027-04",
      "2027-05",
      "2027-06",
    ]);
  });

  it("décalage de mois, passage d'année compris", () => {
    expect([shiftMonth("2026-11", 2), shiftMonth("2026-01", -1), shiftMonth("2026-10", 0)]).toEqual([
      "2027-01",
      "2025-12",
      "2026-10",
    ]);
  });

  it("10 mensualités à partir de septembre", () => {
    const months = billingMonths({ installments: 10, firstMonth: "2026-09-01" });
    expect([months[0], months.at(-1), months.length]).toEqual(["2026-09", "2027-06", 10]);
  });
});

describe("réductions", () => {
  it("arrondies au franc", () => {
    expect(discounted(25000, 10)).toBe(22500);
    expect(discounted(17500, 33)).toBe(11725);
    expect(discounted(10001, 50)).toBe(5001);
    expect(discounted(25000, 100)).toBe(0);
  });

  it("une réduction sur un frais précis l'emporte ; celle des mensualités ne touche pas les frais uniques", () => {
    const discounts = [
      { feeTypeId: null, percent: 10 },
      { feeTypeId: "cantine", percent: 50 },
    ];
    expect(discountFor({ feeTypeId: "mensualite", frequency: "monthly" }, discounts)).toBe(10);
    expect(discountFor({ feeTypeId: "cantine", frequency: "monthly" }, discounts)).toBe(50);
    expect(discountFor({ feeTypeId: "inscription", frequency: "once" }, discounts)).toBe(0);
  });
});

describe("annualFees", () => {
  const rates: FeeRate[] = [
    { feeTypeId: "inscription", amount: 30000, frequency: "once", optional: false },
    { feeTypeId: "mensualite", amount: 25000, frequency: "monthly", optional: false },
    { feeTypeId: "cantine", amount: 10000, frequency: "monthly", optional: true },
    { feeTypeId: "transport", amount: 15000, frequency: "monthly", optional: true },
    { feeTypeId: "tenue", amount: 0, frequency: "once", optional: false },
  ];

  it("frais obligatoires, options choisies, réduction fratrie de 10 % sur les mensualités", () => {
    const { lines, total } = annualFees(rates, 9, new Set(["cantine"]), [{ feeTypeId: null, percent: 10 }]);
    expect(lines).toEqual([
      { feeTypeId: "inscription", amount: 30000, occurrences: 1, discountPercent: 0, total: 30000 },
      { feeTypeId: "mensualite", amount: 22500, occurrences: 9, discountPercent: 10, total: 202500 },
      { feeTypeId: "cantine", amount: 9000, occurrences: 9, discountPercent: 10, total: 81000 },
    ]);
    expect(total).toBe(313500);
  });

  it("sans option ni réduction", () => {
    expect(annualFees(rates, 10, new Set(), []).total).toBe(30000 + 25000 * 10);
  });
});

describe("invoiceStatus", () => {
  const invoice = { total: 25000, amountPaid: 0, cancelled: false, dueOn: "2026-10-05" };
  it("à payer, puis en retard après l'échéance", () => {
    expect(invoiceStatus(invoice, "2026-10-05")).toBe("open");
    expect(invoiceStatus(invoice, "2026-10-06")).toBe("overdue");
  });
  it("payée en partie, payée, annulée", () => {
    expect(invoiceStatus({ ...invoice, amountPaid: 10000 }, "2026-11-01")).toBe("partial");
    expect(invoiceStatus({ ...invoice, amountPaid: 25000 }, "2026-11-01")).toBe("paid");
    expect(invoiceStatus({ ...invoice, cancelled: true }, "2026-11-01")).toBe("cancelled");
  });
});
