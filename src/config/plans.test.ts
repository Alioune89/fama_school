import { describe, expect, it } from "vitest";
import { monthlyPrice, recommendedPlan, yearlyPrice } from "./plans";

describe("formules", () => {
  it("propose la plus petite formule qui couvre l'effectif", () => {
    expect(recommendedPlan(0).id).toBe("starter");
    expect(recommendedPlan(200).id).toBe("starter");
    expect(recommendedPlan(201).id).toBe("school");
    expect(recommendedPlan(1_000).id).toBe("establishment");
    expect(recommendedPlan(1_001).id).toBe("group");
  });

  it("donne le prix mensuel, sauf pour le pilote et le groupe (sur devis)", () => {
    expect(monthlyPrice("school")).toBe(120_000);
    expect(monthlyPrice("pilot")).toBeNull();
    expect(monthlyPrice("group")).toBeNull();
    expect(yearlyPrice(120_000)).toBe(960_000);
  });
});
