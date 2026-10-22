import { describe, expect, it } from "vitest";
import { coveringJustification, periodError, periodLength } from "./period";

describe("periodLength", () => {
  it("compte les deux bornes", () => {
    expect(periodLength("2026-10-20", "2026-10-20")).toBe(1);
    expect(periodLength("2026-10-30", "2026-11-02")).toBe(4);
  });
});

describe("periodError", () => {
  const today = "2026-10-22";

  it("accepte une absence récente ou prévue", () => {
    expect(periodError("2026-10-21", "2026-10-21", today)).toBeNull();
    expect(periodError("2026-09-22", "2026-09-23", today)).toBeNull();
    expect(periodError("2026-10-27", "2026-10-29", today)).toBeNull();
  });

  it("refuse une fin avant le début", () => {
    expect(periodError("2026-10-21", "2026-10-20", today)).toBe("justifications.errors.toBeforeFrom");
  });

  it("refuse au-delà de 30 jours en arrière et 7 jours à l'avance", () => {
    expect(periodError("2026-09-21", "2026-09-21", today)).toBe("justifications.errors.tooOld");
    expect(periodError("2026-10-29", "2026-10-30", today)).toBe("justifications.errors.tooFar");
  });

  it("limite la période à 15 jours", () => {
    expect(periodError("2026-10-01", "2026-10-15", today)).toBeNull();
    expect(periodError("2026-10-01", "2026-10-16", today)).toBe("justifications.errors.tooLong");
  });
});

describe("coveringJustification", () => {
  const list = [
    { id: "a", from: "2026-10-19", to: "2026-10-21", status: "refused" as const },
    { id: "b", from: "2026-10-20", to: "2026-10-20", status: "pending" as const },
    { id: "c", from: "2026-10-21", to: "2026-10-22", status: "accepted" as const },
  ];

  it("retient l'accepté, puis l'attente, puis le refus", () => {
    expect(coveringJustification("2026-10-19", list)?.id).toBe("a");
    expect(coveringJustification("2026-10-20", list)?.id).toBe("b");
    expect(coveringJustification("2026-10-21", list)?.id).toBe("c");
  });

  it("aucun justificatif hors période", () => {
    expect(coveringJustification("2026-10-23", list)).toBeNull();
  });
});
