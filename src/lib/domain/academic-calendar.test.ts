import { describe, expect, it } from "vitest";
import { ageOn, buildPeriods, defaultAcademicYear, parseYearLabel } from "./academic-calendar";

describe("defaultAcademicYear", () => {
  it("en octobre, propose l'année qui commence", () => {
    expect(defaultAcademicYear(new Date("2026-10-19T10:00:00Z"))).toEqual({
      label: "2026-2027",
      startsOn: "2026-10-01",
      endsOn: "2027-07-31",
    });
  });

  it("en mars, reste sur l'année en cours", () => {
    expect(defaultAcademicYear(new Date("2027-03-02T10:00:00Z")).label).toBe("2026-2027");
  });

  it("dès juillet, prépare la rentrée suivante", () => {
    expect(defaultAcademicYear(new Date("2027-07-10T10:00:00Z")).label).toBe("2027-2028");
  });
});

describe("parseYearLabel", () => {
  it("accepte « 2026-2027 » et refuse les années non consécutives", () => {
    expect(parseYearLabel("2026-2027")).toEqual({ startYear: 2026, endYear: 2027 });
    expect(parseYearLabel("2026-2028")).toBeNull();
    expect(parseYearLabel("26-27")).toBeNull();
  });
});

describe("buildPeriods", () => {
  const year = { label: "2026-2027", startsOn: "2026-10-05", endsOn: "2027-07-15" };

  it("coupe l'année en deux semestres à la mi-février", () => {
    expect(buildPeriods(year, "semester")).toEqual([
      { position: 1, label: "1er semestre", startsOn: "2026-10-05", endsOn: "2027-02-15" },
      { position: 2, label: "2e semestre", startsOn: "2027-02-16", endsOn: "2027-07-15" },
    ]);
  });

  it("coupe l'année en trois trimestres aux vacances de Noël et de Pâques", () => {
    expect(buildPeriods(year, "trimester")).toEqual([
      { position: 1, label: "1er trimestre", startsOn: "2026-10-05", endsOn: "2027-01-04" },
      { position: 2, label: "2e trimestre", startsOn: "2027-01-05", endsOn: "2027-04-05" },
      { position: 3, label: "3e trimestre", startsOn: "2027-04-06", endsOn: "2027-07-15" },
    ]);
  });

  it("enchaîne les périodes sans trou ni chevauchement", () => {
    const periods = buildPeriods(year, "trimester");
    for (let i = 1; i < periods.length; i++) {
      const previousEnd = new Date(`${periods[i - 1]!.endsOn}T00:00:00Z`);
      previousEnd.setUTCDate(previousEnd.getUTCDate() + 1);
      expect(previousEnd.toISOString().slice(0, 10)).toBe(periods[i]!.startsOn);
    }
  });
});

describe("ageOn", () => {
  it("calcule l'âge révolu", () => {
    expect(ageOn("2015-03-14", new Date("2026-03-13T12:00:00Z"))).toBe(10);
    expect(ageOn("2015-03-14", new Date("2026-03-14T12:00:00Z"))).toBe(11);
  });
});
