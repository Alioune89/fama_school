import { describe, expect, it } from "vitest";
import {
  ARABIC_SUBJECT_PRESETS,
  CYCLE_PRESETS,
  SUBJECT_PRESETS,
  appliesToLevel,
  classLetters,
  classNames,
  coefficientFor,
  expandLevels,
} from "./senegal-presets";

describe("préréglages des cycles", () => {
  it("couvre les quatre cycles du système sénégalais, dans l'ordre", () => {
    expect(CYCLE_PRESETS.map((cycle) => cycle.code)).toEqual(["prescolaire", "elementaire", "moyen", "secondaire"]);
  });

  it("utilise les barèmes habituels : appréciations, sur 10, sur 20", () => {
    expect(Object.fromEntries(CYCLE_PRESETS.map((cycle) => [cycle.code, cycle.gradingScale]))).toEqual({
      prescolaire: "appreciation",
      elementaire: "ten",
      moyen: "twenty",
      secondaire: "twenty",
    });
  });

  it("place les examens nationaux au bon niveau", () => {
    const exams = CYCLE_PRESETS.flatMap((cycle) => cycle.levels.filter((level) => level.exam).map((level) => `${level.code}:${level.exam}`));
    expect(exams).toEqual(["CM2:CFEE", "3e:BFEM", "Tle:BAC"]);
  });

  it("décline le lycée par série : L ou S en Seconde, séries choisies en Première et Terminale", () => {
    const levels = expandLevels("secondaire", { seconde: ["S"], upper: ["S1", "S2", "G"] });
    expect(levels.map((level) => `${level.code} ${level.series}`)).toEqual([
      "2nde S",
      "1ère S1",
      "1ère S2",
      "1ère G",
      "Tle S1",
      "Tle S2",
      "Tle G",
    ]);
    expect(levels.find((level) => level.code === "Tle")?.exam).toBe("BAC");
  });
});

describe("préréglages des matières", () => {
  it.each(Object.entries(SUBJECT_PRESETS))("%s : noms uniques et coefficients positifs", (_, subjects) => {
    const names = subjects.map((subject) => subject.name);
    expect(new Set(names).size).toBe(names.length);
    for (const subject of subjects) {
      expect(subject.coefficient.default).toBeGreaterThan(0);
      for (const value of Object.values(subject.coefficient.bySeries ?? {})) expect(value).toBeGreaterThan(0);
    }
  });

  it("donne plus de poids aux sciences en série S et aux lettres en série L", () => {
    const maths = SUBJECT_PRESETS.secondaire.find((subject) => subject.name === "Mathématiques")!;
    const philo = SUBJECT_PRESETS.secondaire.find((subject) => subject.name === "Philosophie")!;
    expect(coefficientFor(maths.coefficient, "S")).toBe(5);
    expect(coefficientFor(maths.coefficient, "L")).toBe(2);
    expect(coefficientFor(philo.coefficient, "L")).toBe(5);
  });

  it("applique aux séries numérotées les coefficients de leur famille", () => {
    const maths = SUBJECT_PRESETS.secondaire.find((subject) => subject.name === "Mathématiques")!;
    expect(coefficientFor(maths.coefficient, "S1")).toBe(5);
    expect(coefficientFor(maths.coefficient, "T2")).toBe(5);
    expect(coefficientFor(maths.coefficient, "L'1")).toBe(2);
    expect(coefficientFor(maths.coefficient, "G")).toBe(2);
  });

  it("n'enseigne la philosophie qu'en 1ère et en Terminale", () => {
    const philo = SUBJECT_PRESETS.secondaire.find((subject) => subject.name === "Philosophie")!;
    expect(appliesToLevel(philo, { code: "2nde", label: "Seconde" })).toBe(false);
    expect(appliesToLevel(philo, { code: "Tle", label: "Terminale" })).toBe(true);
  });

  it("propose la filière arabe avec les intitulés en arabe", () => {
    expect(ARABIC_SUBJECT_PRESETS.every((subject) => subject.track === "arabic" && subject.nameAr)).toBe(true);
    expect(ARABIC_SUBJECT_PRESETS.map((subject) => subject.name)).toContain("Coran");
  });
});

describe("noms des classes", () => {
  it("nomme les classes parallèles par lettre", () => {
    expect(classNames({ code: "CM2", label: "Cours moyen 2" }, 3)).toEqual(["CM2 A", "CM2 B", "CM2 C"]);
  });

  it("numérote les classes de lycée dans la série", () => {
    expect(classNames({ code: "2nde", label: "Seconde", series: "S" }, 2)).toEqual(["2nde S1", "2nde S2"]);
    expect(classNames({ code: "Tle", label: "Terminale", series: "L" }, 1)).toEqual(["Tle L"]);
  });

  it("nomme par lettre les classes parallèles d'une série numérotée", () => {
    expect(classNames({ code: "1ère", label: "Première", series: "S1" }, 2)).toEqual(["1ère S1 A", "1ère S1 B"]);
    expect(classNames({ code: "Tle", label: "Terminale", series: "L2" }, 1)).toEqual(["Tle L2"]);
  });

  it("refuse un nombre de classes hors limites", () => {
    expect(() => classLetters(27)).toThrow(RangeError);
    expect(classLetters(0)).toEqual([]);
  });
});
