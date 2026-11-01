import { describe, expect, it } from "vitest";
import { daysBetween, endOfMonth, subscriptionState, suggestedCoverage } from "./subscription";

describe("abonnement d'une école", () => {
  it("dit si l'abonnement est à jour, se termine bientôt ou est échu", () => {
    expect(subscriptionState(null, "2027-06-01")).toEqual({ state: "unset", days: null });
    expect(subscriptionState("2027-06-30", "2027-06-01")).toEqual({ state: "active", days: 29 });
    expect(subscriptionState("2027-06-30", "2027-06-15")).toEqual({ state: "endingSoon", days: 15 });
    expect(subscriptionState("2027-06-30", "2027-06-30")).toEqual({ state: "endingSoon", days: 0 });
    expect(subscriptionState("2027-06-30", "2027-07-03")).toEqual({ state: "expired", days: 3 });
  });

  it("compte les jours entre deux dates et donne la fin du mois", () => {
    expect(daysBetween("2027-02-27", "2027-03-01")).toBe(2);
    expect(endOfMonth("2027-01-15")).toBe("2027-01-31");
    expect(endOfMonth("2027-01-15", 1)).toBe("2027-02-28");
    expect(endOfMonth("2027-12-05", 1)).toBe("2028-01-31");
  });

  it("propose le mois qui suit la fin actuelle, ou le mois en cours si l'abonnement est échu", () => {
    expect(suggestedCoverage("2027-06-30", "2027-06-20")).toBe("2027-07-31");
    expect(suggestedCoverage("2027-06-30", "2027-07-10")).toBe("2027-07-31");
    expect(suggestedCoverage(null, "2027-07-10")).toBe("2027-07-31");
  });
});
