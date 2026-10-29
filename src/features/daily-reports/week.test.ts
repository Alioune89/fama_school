import { describe, expect, it } from "vitest";
import { shiftDays, weekStart } from "./week";

describe("weekStart", () => {
  it("ramène au lundi, dimanche compris", () => {
    expect(weekStart("2026-10-29")).toBe("2026-10-26");
    expect(weekStart("2026-10-26")).toBe("2026-10-26");
    expect(weekStart("2026-11-01")).toBe("2026-10-26");
  });
  it("décale de quelques jours", () => {
    expect(shiftDays("2026-10-26", 7)).toBe("2026-11-02");
  });
});
