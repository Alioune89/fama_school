import { describe, expect, it } from "vitest";
import { schoolCalendar, todayInDakar } from "./calendar";

const year = {
  startsOn: "2026-10-05",
  endsOn: "2027-07-15",
  periods: [
    { id: "s2", position: 2, label: "Second semestre", starts_on: "2027-02-15", ends_on: "2027-07-15", locked_at: null },
    { id: "s1", position: 1, label: "Premier semestre", starts_on: "2026-10-05", ends_on: "2027-02-14", locked_at: null },
  ],
};

describe("schoolCalendar", () => {
  it("compte les jours avant la rentrée", () => {
    const calendar = schoolCalendar(year, "2026-09-28");
    expect(calendar.phase).toBe("before");
    expect(calendar.daysLeft).toBe(7);
    expect(calendar.yearProgress).toBe(0);
    expect(calendar.periods.map((p) => p.state)).toEqual(["upcoming", "upcoming"]);
  });

  it("situe la période en cours, dans l'ordre des périodes", () => {
    const calendar = schoolCalendar(year, "2026-10-20");
    expect(calendar.phase).toBe("during");
    expect(calendar.daysLeft).toBe(268);
    expect(calendar.periods.map((p) => [p.label, p.state])).toEqual([
      ["Premier semestre", "current"],
      ["Second semestre", "upcoming"],
    ]);
    expect(calendar.periods[0]!.progress).toBe(11);
  });

  it("le dernier jour d'une période en fait encore partie", () => {
    const calendar = schoolCalendar(year, "2027-02-14");
    expect(calendar.periods.map((p) => p.state)).toEqual(["current", "upcoming"]);
    expect(calendar.periods[0]!.progress).toBe(100);
  });

  it("après la fin de l'année, tout est passé", () => {
    const calendar = schoolCalendar(year, "2027-08-01");
    expect(calendar.phase).toBe("after");
    expect(calendar.daysLeft).toBe(0);
    expect(calendar.yearProgress).toBe(100);
    expect(calendar.periods.every((p) => p.state === "past")).toBe(true);
  });
});

describe("todayInDakar", () => {
  it("prend la date UTC (Dakar est à UTC+0)", () => {
    expect(todayInDakar(new Date("2026-10-20T23:30:00Z"))).toBe("2026-10-20");
  });
});
