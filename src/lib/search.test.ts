import { describe, expect, it } from "vitest";
import { sanitizeSearch } from "./search";

describe("sanitizeSearch", () => {
  it("garde une recherche simple", () => {
    expect(sanitizeSearch("  Awa Diop ")).toBe("Awa Diop");
  });

  it("neutralise les caractères qui modifieraient le filtre PostgREST", () => {
    expect(sanitizeSearch("a%,role.eq.director)")).toBe("a role eq director");
    expect(sanitizeSearch("x_y*z")).toBe("x y z");
  });

  it("ignore les recherches trop courtes", () => {
    expect(sanitizeSearch("a")).toBeNull();
    expect(sanitizeSearch("")).toBeNull();
    expect(sanitizeSearch(null)).toBeNull();
  });

  it("limite la longueur", () => {
    expect(sanitizeSearch("b".repeat(200))?.length).toBe(60);
  });
});
