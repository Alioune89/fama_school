import { describe, expect, it } from "vitest";
import { dayRanges, isAvailableNow } from "./availability";

describe("isAvailableNow", () => {
  const week = { days: [1, 2, 3, 4, 5], startsAt: "08:00", endsAt: "18:00" };
  it("un mardi à 10 h : disponible", () => {
    expect(isAvailableNow(week, new Date("2026-10-27T10:00:00Z"))).toBe(true);
  });
  it("un mardi à 19 h, ou un dimanche : pas disponible", () => {
    expect(isAvailableNow(week, new Date("2026-10-27T19:00:00Z"))).toBe(false);
    expect(isAvailableNow(week, new Date("2026-11-01T10:00:00Z"))).toBe(false);
  });
});

describe("dayRanges", () => {
  it("regroupe les jours qui se suivent", () => {
    expect(dayRanges([1, 2, 3, 4, 5])).toEqual([[1, 5]]);
    expect(dayRanges([3, 1, 4])).toEqual([
      [1, 1],
      [3, 4],
    ]);
  });
});
