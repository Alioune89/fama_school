import { describe, expect, it } from "vitest";
import {
  acquisitionSummary,
  annualAverage,
  appreciation,
  classStats,
  generalAverage,
  mention,
  ranks,
  round2,
  subjectAverage,
  toScale,
  type GradeEntry,
} from "./grading";
import { DEFAULT_SETTINGS } from "./school-settings";

const weights = DEFAULT_SETTINGS.evaluationWeights; // devoir 1, interrogation 1, composition 2
const on20 = DEFAULT_SETTINGS.mentionThresholds.twenty;
const on10 = DEFAULT_SETTINGS.mentionThresholds.ten;

const g = (
  kind: GradeEntry["kind"],
  score: number | null,
  maxScore = 20,
  status: GradeEntry["status"] = "graded",
): GradeEntry => ({
  kind,
  score,
  maxScore,
  status,
});

describe("round2", () => {
  it("arrondit au centième le plus proche, sans erreur de virgule flottante", () => {
    expect(round2(12.345)).toBe(12.35);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(12.344)).toBe(12.34);
    expect(round2(10)).toBe(10);
  });
});

describe("toScale", () => {
  it("ramène une note au barème du cycle", () => {
    expect(toScale(7, 10, "twenty")).toBe(14);
    expect(toScale(15, 20, "ten")).toBe(7.5);
    expect(toScale(18, 20, "twenty")).toBe(18);
  });

  it("refuse un barème nul", () => {
    expect(() => toScale(5, 0, "twenty")).toThrow(RangeError);
  });
});

describe("subjectAverage", () => {
  it("(devoirs + interrogations + 2 × composition) ÷ 4 avec les poids par défaut", () => {
    // Devoirs : (12 + 14) / 2 = 13 ; interrogation : 10 ; composition : 15 → (13 + 10 + 30) / 4 = 13,25
    const grades = [g("devoir", 12), g("devoir", 14), g("interrogation", 10), g("composition", 15)];
    expect(subjectAverage(grades, "twenty", weights)).toBeCloseTo(13.25);
  });

  it("un type sans note ne compte pas : seule la composition → sa note", () => {
    expect(subjectAverage([g("composition", 11)], "twenty", weights)).toBe(11);
    // Devoir 16, composition 10 → (16 + 2 × 10) / 3 = 12
    expect(subjectAverage([g("devoir", 16), g("composition", 10)], "twenty", weights)).toBe(12);
  });

  it("absent sans justificatif : 0 ; absent excusé : l'évaluation ne compte pas", () => {
    expect(subjectAverage([g("devoir", 14), g("devoir", null, 20, "absent")], "twenty", weights)).toBe(7);
    expect(subjectAverage([g("devoir", 14), g("devoir", null, 20, "excused")], "twenty", weights)).toBe(14);
  });

  it("sans aucune note qui compte : pas de moyenne", () => {
    expect(subjectAverage([], "twenty", weights)).toBeNull();
    expect(subjectAverage([g("devoir", null, 20, "excused")], "twenty", weights)).toBeNull();
  });

  it("notes sur 10 ramenées au barème sur 20, et inversement à l'élémentaire", () => {
    expect(subjectAverage([g("interrogation", 8, 10)], "twenty", weights)).toBe(16);
    expect(subjectAverage([g("composition", 14, 20)], "ten", weights)).toBe(7);
  });

  it("coefficient d'une évaluation au sein de son type", () => {
    const grades: GradeEntry[] = [
      { ...g("devoir", 10), weight: 1 },
      { ...g("devoir", 16), weight: 2 },
    ];
    expect(subjectAverage(grades, "twenty", weights)).toBe(14);
  });

  it("un type de poids nul est ignoré (école qui ne compte que la composition)", () => {
    const onlyExam = { devoir: 0, interrogation: 0, composition: 1 };
    expect(subjectAverage([g("devoir", 20), g("composition", 9)], "twenty", onlyExam)).toBe(9);
    expect(subjectAverage([g("devoir", 20)], "twenty", onlyExam)).toBeNull();
  });
});

describe("generalAverage", () => {
  it("pondère les moyennes de matières par leur coefficient", () => {
    // Français 12 × 4, maths 15 × 4, anglais 10 × 2 → (48 + 60 + 20) / 10 = 12,8
    expect(
      generalAverage([
        { average: 12, coefficient: 4 },
        { average: 15, coefficient: 4 },
        { average: 10, coefficient: 2 },
      ]),
    ).toBeCloseTo(12.8);
  });

  it("utilise les moyennes de matières arrondies, comme sur le bulletin", () => {
    // 12,345 → 12,35 ; 10 → 10 : (12,35 + 10) / 2 = 11,175
    expect(
      generalAverage([
        { average: 12.345, coefficient: 1 },
        { average: 10, coefficient: 1 },
      ]),
    ).toBeCloseTo(11.175);
  });

  it("ignore les matières sans note", () => {
    expect(
      generalAverage([
        { average: 14, coefficient: 2 },
        { average: null, coefficient: 5 },
      ]),
    ).toBe(14);
    expect(generalAverage([{ average: null, coefficient: 1 }])).toBeNull();
  });
});

describe("annualAverage", () => {
  it("moyenne des périodes notées", () => {
    expect(annualAverage([12, 14])).toBe(13);
    expect(annualAverage([11, null, 13])).toBe(12);
    expect(annualAverage([null, null])).toBeNull();
  });
});

describe("ranks", () => {
  it("1er, 2e ex æquo, 2e ex æquo, 4e", () => {
    const result = ranks([
      { id: "a", average: 15.2 },
      { id: "b", average: 13.004 },
      { id: "c", average: 12.996 },
      { id: "d", average: 11 },
    ]);
    expect(result.get("a")).toEqual({ rank: 1, exAequo: false });
    // 13,004 et 12,996 s'arrondissent tous deux à 13,00 : ex æquo.
    expect(result.get("b")).toEqual({ rank: 2, exAequo: true });
    expect(result.get("c")).toEqual({ rank: 2, exAequo: true });
    expect(result.get("d")).toEqual({ rank: 4, exAequo: false });
  });

  it("les élèves sans moyenne ne sont pas classés", () => {
    const result = ranks([
      { id: "a", average: null },
      { id: "b", average: 9 },
    ]);
    expect(result.has("a")).toBe(false);
    expect(result.get("b")).toEqual({ rank: 1, exAequo: false });
  });
});

describe("mention", () => {
  it("seuils par défaut sur 20 : 16, 14, 12", () => {
    expect(mention(16, on20)).toBe("felicitations");
    expect(mention(15.99, on20)).toBe("encouragements");
    expect(mention(14, on20)).toBe("encouragements");
    expect(mention(12, on20)).toBe("tableauHonneur");
    expect(mention(11.99, on20)).toBeNull();
    expect(mention(null, on20)).toBeNull();
  });

  it("se décide sur la moyenne arrondie : 11,995 → 12,00 → tableau d'honneur", () => {
    expect(mention(11.995, on20)).toBe("tableauHonneur");
  });

  it("seuils par défaut sur 10 : 8, 7, 6", () => {
    expect(mention(8.5, on10)).toBe("felicitations");
    expect(mention(7, on10)).toBe("encouragements");
    expect(mention(6.2, on10)).toBe("tableauHonneur");
    expect(mention(5.9, on10)).toBeNull();
  });
});

describe("appreciation", () => {
  it("sur 20", () => {
    expect(appreciation(18.5, "twenty")).toBe("excellent");
    expect(appreciation(16, "twenty")).toBe("tresBien");
    expect(appreciation(14.5, "twenty")).toBe("bien");
    expect(appreciation(12, "twenty")).toBe("assezBien");
    expect(appreciation(10, "twenty")).toBe("passable");
    expect(appreciation(9.99, "twenty")).toBe("insuffisant");
    expect(appreciation(6, "twenty")).toBe("faible");
    expect(appreciation(3, "twenty")).toBe("tresFaible");
    expect(appreciation(null, "twenty")).toBeNull();
  });

  it("sur 10, seuils divisés par deux", () => {
    expect(appreciation(9, "ten")).toBe("excellent");
    expect(appreciation(5, "ten")).toBe("passable");
    expect(appreciation(4.9, "ten")).toBe("insuffisant");
  });
});

describe("classStats", () => {
  it("moyenne de la classe, plus forte et plus faible", () => {
    expect(classStats([12, 15.5, null, 9.25])).toEqual({ average: 12.25, highest: 15.5, lowest: 9.25, count: 3 });
    expect(classStats([null])).toBeNull();
  });
});

describe("acquisitionSummary (préscolaire)", () => {
  it("le niveau le plus fréquent", () => {
    expect(acquisitionSummary(["acquired", "inProgress", "acquired"])).toBe("acquired");
  });

  it("à égalité, le plus récent", () => {
    expect(acquisitionSummary(["notAcquired", "inProgress"])).toBe("inProgress");
    expect(acquisitionSummary(["inProgress", "acquired", "acquired", "inProgress"])).toBe("inProgress");
  });

  it("sans évaluation : pas de bilan", () => {
    expect(acquisitionSummary([])).toBeNull();
  });
});
