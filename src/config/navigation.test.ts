import { describe, expect, it } from "vitest";
import { NAVIGATION, navigationFor } from "./navigation";

const labels = (roles: Parameters<typeof navigationFor>[1]) => navigationFor("direction", roles).menu.map((item) => item.label);

describe("menu de la direction selon le rôle", () => {
  it("le directeur voit toutes les rubriques", () => {
    expect(labels(["director"])).toHaveLength(NAVIGATION.direction.menu.length);
    expect(navigationFor("direction", ["director"]).other).toHaveLength(NAVIGATION.direction.other.length);
  });

  it("le comptable ne voit que son métier (pas de messagerie : il n'a pas de boîte de réception)", () => {
    expect(labels(["accountant"])).toEqual(["dashboard", "students", "guardians", "finance", "announcements", "calendar"]);
    expect(navigationFor("direction", ["accountant"]).mobile.map((item) => item.label)).toEqual([
      "dashboard",
      "students",
      "finance",
      "guardians",
    ]);
  });

  it("le surveillant : élèves, parents, classes et présences", () => {
    expect(labels(["supervisor"])).toEqual([
      "dashboard",
      "students",
      "guardians",
      "classes",
      "attendance",
      "announcements",
      "calendar",
      "messages",
    ]);
  });

  it("plusieurs rôles additionnent leurs rubriques", () => {
    expect(labels(["accountant", "secretary"])).toContain("finance");
    expect(labels(["accountant", "secretary"])).toContain("staff");
  });

  it("sans session, seules les rubriques communes à tous apparaissent", () => {
    expect(labels(null)).toEqual(["dashboard", "students", "announcements", "calendar"]);
  });

  it("les autres espaces ne changent pas", () => {
    expect(navigationFor("parent", ["parent"]).menu).toHaveLength(6);
  });
});
