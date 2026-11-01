import { describe, expect, it } from "vitest";
import { daysSince, latest, schoolHealth } from "./health";

const now = new Date("2027-04-20T12:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

describe("santé d'une école", () => {
  it("considère une école sans élèves comme en mise en route", () => {
    expect(schoolHealth({ activeStudents: 0, lastActivity: null, now })).toBe("setup");
    expect(schoolHealth({ activeStudents: 0, lastActivity: daysAgo(30), now })).toBe("setup");
  });

  it("classe l'école selon sa dernière activité", () => {
    expect(schoolHealth({ activeStudents: 120, lastActivity: daysAgo(0), now })).toBe("active");
    expect(schoolHealth({ activeStudents: 120, lastActivity: daysAgo(7), now })).toBe("active");
    expect(schoolHealth({ activeStudents: 120, lastActivity: daysAgo(8), now })).toBe("slowing");
    expect(schoolHealth({ activeStudents: 120, lastActivity: daysAgo(14), now })).toBe("slowing");
    expect(schoolHealth({ activeStudents: 120, lastActivity: daysAgo(15), now })).toBe("inactive");
    expect(schoolHealth({ activeStudents: 120, lastActivity: null, now })).toBe("inactive");
  });

  it("garde la date la plus récente et compte les jours écoulés", () => {
    expect(latest(null, daysAgo(3), undefined, daysAgo(1))).toBe(daysAgo(1));
    expect(latest(null, undefined)).toBeNull();
    expect(daysSince(daysAgo(2), now)).toBe(2);
    expect(daysSince(null, now)).toBeNull();
  });
});
