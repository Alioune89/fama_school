import { describe, expect, it } from "vitest";
import { hasClassTeacher, suggestedTeacherTitle } from "./teaching";

describe("hasClassTeacher", () => {
  it("le préscolaire et l'élémentaire ont un titulaire, pas le moyen ni le secondaire", () => {
    expect(hasClassTeacher("prescolaire")).toBe(true);
    expect(hasClassTeacher("elementaire")).toBe(true);
    expect(hasClassTeacher("moyen")).toBe(false);
    expect(hasClassTeacher("secondaire")).toBe(false);
    expect(hasClassTeacher(null)).toBe(false);
  });
});

describe("suggestedTeacherTitle", () => {
  it("propose le titre selon le cycle et le genre", () => {
    expect(suggestedTeacherTitle("prescolaire", "F")).toBe("Éducatrice");
    expect(suggestedTeacherTitle("elementaire", "M")).toBe("Instituteur");
    expect(suggestedTeacherTitle("elementaire", "F")).toBe("Institutrice");
    expect(suggestedTeacherTitle("secondaire", "F")).toBe("Professeure");
    expect(suggestedTeacherTitle("moyen", null)).toBe("Professeur");
    expect(suggestedTeacherTitle(null, "F")).toBeNull();
  });
});
