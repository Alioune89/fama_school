import { describe, expect, it } from "vitest";
import { attendanceRate, dayCell, isValidDay, isValidMonth, monthDays, shiftDay, shiftMonth } from "./report";

describe("shiftDay et shiftMonth", () => {
  it("passent d'un mois ou d'une année à l'autre", () => {
    expect(shiftDay("2026-10-31", 1)).toBe("2026-11-01");
    expect(shiftDay("2026-11-01", -1)).toBe("2026-10-31");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
  });
});

describe("validation des paramètres d'adresse", () => {
  it("n'accepte que des mois et des jours bien formés", () => {
    expect(isValidMonth("2026-10")).toBe(true);
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidDay("2026-10-21")).toBe(true);
    expect(isValidDay("21/10/2026")).toBe(false);
  });
});

describe("monthDays", () => {
  it("garde les jours de semaine jusqu'à aujourd'hui, et les samedis avec appel", () => {
    // Octobre 2026 : le 1er est un jeudi, le 3 un samedi, le 4 un dimanche.
    expect(monthDays("2026-10", "2026-10-06", new Set())).toEqual(["2026-10-01", "2026-10-02", "2026-10-05", "2026-10-06"]);
    expect(monthDays("2026-10", "2026-10-06", new Set(["2026-10-03"]))).toContain("2026-10-03");
  });
});

describe("dayCell", () => {
  it("résume la journée d'un élève", () => {
    expect(dayCell({}).kind).toBe("none");
    expect(dayCell({ morning: "present", afternoon: "present" }).kind).toBe("present");
    expect(dayCell({ morning: "late", afternoon: "present" }).kind).toBe("late");
    expect(dayCell({ morning: "absent", afternoon: "present" }).kind).toBe("halfAbsent");
    expect(dayCell({ morning: "absent", afternoon: "absent" }).kind).toBe("absent");
    expect(dayCell({ morning: "absent" }).kind).toBe("absent");
  });
});

describe("attendanceRate", () => {
  it("compte les retards comme présents", () => {
    expect(attendanceRate(200, 9)).toBe(96);
    expect(attendanceRate(0, 0)).toBeNull();
  });
});
