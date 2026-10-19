import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone, toAuthPhone } from "./phone";

describe("normalizePhone", () => {
  it.each([
    ["77 123 45 67", "+221771234567"],
    ["771234567", "+221771234567"],
    ["+221 77 123 45 67", "+221771234567"],
    ["00221771234567", "+221771234567"],
    ["70 999 00 01", "+221709990001"],
    ["76-555-44-33", "+221765554433"],
  ])("normalise « %s » en %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "   ", "12345", "77 123", "abcdefghi"])("refuse « %s »", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });

  it("accepte un numéro étranger saisi au format international", () => {
    expect(normalizePhone("+33 6 12 34 56 78")).toBe("+33612345678");
  });
});

describe("formatPhone", () => {
  it("affiche un numéro sénégalais par groupes", () => {
    expect(formatPhone("+221771234567")).toBe("+221 77 123 45 67");
  });

  it("renvoie une chaîne vide sans numéro", () => {
    expect(formatPhone(null)).toBe("");
  });
});

describe("toAuthPhone", () => {
  it("retire le « + » attendu par Supabase Auth", () => {
    expect(toAuthPhone("+221771234567")).toBe("221771234567");
  });
});
