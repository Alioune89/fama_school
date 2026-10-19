import { describe, expect, it } from "vitest";
import { SLUG_PATTERN, nextAvailableSlug, slugify } from "./slug";

describe("slugify", () => {
  it.each([
    ["Groupe Scolaire Les Baobabs", "groupe-scolaire-les-baobabs"],
    ["Institut Franco-Arabe Al Amine", "institut-franco-arabe-al-amine"],
    ["École Sainte-Thérèse d'Avila", "ecole-sainte-therese-davila"],
    ["  Cours   Privés  « Keur Fama »  ", "cours-prives-keur-fama"],
  ])("« %s » → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
    expect(SLUG_PATTERN.test(expected)).toBe(true);
  });

  it("tronque sans laisser de tiret final", () => {
    const slug = slugify("a".repeat(55) + " bcdefgh", 60);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("nextAvailableSlug", () => {
  it("ajoute un numéro si l'identifiant est pris", () => {
    expect(nextAvailableSlug("les-baobabs", new Set())).toBe("les-baobabs");
    expect(nextAvailableSlug("les-baobabs", new Set(["les-baobabs", "les-baobabs-2"]))).toBe("les-baobabs-3");
  });
});
