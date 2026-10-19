import { describe, expect, it } from "vitest";
import { isProtectedPath, listSpaces, spaceForRole, stripLocalePrefix, type MembershipSummary } from "./spaces";

const baobabs = { schoolId: "s1", schoolName: "Les Baobabs" };
const alAmine = { schoolId: "s2", schoolName: "Al Amine" };

describe("spaceForRole", () => {
  it("envoie tout le personnel administratif vers la direction", () => {
    for (const role of ["owner", "director", "censor", "supervisor", "accountant", "secretary"] as const) {
      expect(spaceForRole(role)).toBe("direction");
    }
  });

  it("distingue professeurs et parents ; le chauffeur n'a pas encore d'espace", () => {
    expect(spaceForRole("teacher")).toBe("professeur");
    expect(spaceForRole("parent")).toBe("parent");
    expect(spaceForRole("driver")).toBeNull();
  });
});

describe("listSpaces", () => {
  it("crée un espace professeur par école pour un vacataire", () => {
    const memberships: MembershipSummary[] = [
      { role: "teacher", ...baobabs },
      { role: "teacher", ...alAmine },
    ];
    const spaces = listSpaces(memberships, false);
    expect(spaces.map((s) => [s.space, s.schoolName])).toEqual([
      ["professeur", "Al Amine"],
      ["professeur", "Les Baobabs"],
    ]);
  });

  it("regroupe les rôles de direction d'une même école et un seul espace parent", () => {
    const memberships: MembershipSummary[] = [
      { role: "director", ...baobabs },
      { role: "accountant", ...baobabs },
      { role: "parent", ...baobabs },
      { role: "parent", ...alAmine },
    ];
    const spaces = listSpaces(memberships, false);
    expect(spaces).toEqual([
      { space: "direction", schoolId: "s1", schoolName: "Les Baobabs", roles: ["director", "accountant"] },
      { space: "parent", schoolId: null, schoolName: null, roles: ["parent"] },
    ]);
  });

  it("ajoute la plateforme en tête pour l'équipe Fama School", () => {
    expect(listSpaces([{ role: "teacher", ...baobabs }], true).map((s) => s.space)).toEqual(["plateforme", "professeur"]);
  });

  it("ne renvoie rien pour un compte sans invitation", () => {
    expect(listSpaces([], false)).toEqual([]);
  });
});

describe("stripLocalePrefix", () => {
  it.each([
    ["/wo/direction/eleves", "wo", "/direction/eleves"],
    ["/direction", null, "/direction"],
    ["/wo", "wo", "/"],
    ["/", null, "/"],
    ["/parent/", null, "/parent"],
  ])("%s → langue %s, chemin %s", (pathname, locale, path) => {
    expect(stripLocalePrefix(pathname, ["fr", "wo"])).toEqual({ locale, path });
  });
});

describe("isProtectedPath", () => {
  it.each([
    ["/direction", true],
    ["/direction/eleves", true],
    ["/choisir-espace", true],
    ["/parentalite", false],
    ["/connexion", false],
    ["/", false],
  ])("%s → %s", (path, expected) => {
    expect(isProtectedPath(path)).toBe(expected);
  });
});
