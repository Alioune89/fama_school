import { describe, expect, it } from "vitest";
import { buildClassReportCards, type BuildInput } from "./build";

const student = (id: string, firstName: string) => ({
  id,
  firstName,
  lastName: "Test",
  matricule: id.toUpperCase(),
  sex: "F" as const,
  birthDate: null,
  birthPlace: null,
});

const graded = (studentId: string, score: number) => ({ studentId, status: "graded" as const, score, acquisition: null });

/** Trois élèves ; français et maths (coef. 4), Coran (coef. 2, filière arabe, noté sur 10). */
function input(overrides: Partial<BuildInput> = {}): BuildInput {
  return {
    school: { name: "École Test", city: "Dakar", address: null, phone: null, email: null },
    academicYear: "2026-2027",
    periodLabel: "1er semestre",
    className: "6e A",
    levelLabel: "Sixième",
    scale: "twenty",
    francoArabic: true,
    weights: { devoir: 1, interrogation: 1, composition: 2 },
    thresholds: {
      twenty: { felicitations: 16, encouragements: 14, tableauHonneur: 12 },
      ten: { felicitations: 8, encouragements: 7, tableauHonneur: 6 },
    },
    homeroomTeacher: "Awa Diop",
    students: [student("a", "Aïda"), student("b", "Bineta"), student("c", "Coumba")],
    subjects: [
      { id: "fr", name: "Français", nameAr: null, track: "french", coefficient: 4 },
      { id: "ma", name: "Mathématiques", nameAr: null, track: "french", coefficient: 4 },
      { id: "co", name: "Coran", nameAr: "القرآن", track: "arabic", coefficient: 2 },
    ],
    evaluations: [
      {
        subjectId: "fr",
        kind: "devoir",
        maxScore: 20,
        weight: 1,
        grades: [graded("a", 16), graded("b", 12), { studentId: "c", status: "absent", score: null, acquisition: null }],
      },
      {
        subjectId: "fr",
        kind: "composition",
        maxScore: 20,
        weight: 1,
        grades: [graded("a", 14), graded("b", 12), graded("c", 10)],
      },
      {
        subjectId: "ma",
        kind: "composition",
        maxScore: 20,
        weight: 1,
        grades: [graded("a", 10), graded("b", 18), { studentId: "c", status: "excused", score: null, acquisition: null }],
      },
      { subjectId: "co", kind: "devoir", maxScore: 10, weight: 1, grades: [graded("a", 9), graded("b", 5), graded("c", 7)] },
    ],
    appreciations: new Map([["fr:a", "Très bon trimestre."]]),
    council: new Map([["a", { sanction: null, withholdMention: false, appreciation: "Élève sérieuse." }]]),
    absences: new Map([["c", { absent: 3, late: 1 }]]),
    ...overrides,
  };
}

describe("buildClassReportCards", () => {
  const cards = buildClassReportCards(input());
  const a = cards.get("a")!;
  const b = cards.get("b")!;
  const c = cards.get("c")!;

  it("moyennes par matière (absent 0, excusé ignoré), rangs et moyenne de classe", () => {
    const [french] = a.sections;
    expect(french!.subjects.map((s) => [s.name, s.average, s.rank?.rank])).toEqual([
      ["Français", 14.67, 1],
      ["Mathématiques", 10, 2],
    ]);
    expect(french!.subjects[0]!.classAverage).toBe(11.11);
    expect(french!.subjects[0]!.appreciation).toBe("Très bon trimestre.");
    expect(c.sections[0]!.subjects[1]).toMatchObject({ average: null, rank: null });
  });

  it("bulletin double : programme français et programme arabe, chacun avec sa moyenne et son rang", () => {
    expect(a.sections.map((s) => [s.track, s.average, s.rank?.rank])).toEqual([
      ["french", 12.34, 2],
      ["arabic", 18, 1],
    ]);
    expect(a.sections[1]!.subjects[0]).toMatchObject({ name: "Coran", nameAr: "القرآن", average: 18 });
  });

  it("moyenne générale sur toutes les matières, rang, mention et décisions du conseil", () => {
    expect([a.general, a.rank?.rank, a.mention]).toEqual([13.47, 2, "tableauHonneur"]);
    expect([b.general, b.rank?.rank, b.mention]).toEqual([14, 1, "encouragements"]);
    expect([c.general, c.rank?.rank, c.mention]).toEqual([9.11, 3, null]);
    expect(a.classStats).toMatchObject({ average: 12.19, highest: 14, lowest: 9.11 });
    expect(a.generalAppreciation).toBe("Élève sérieuse.");
    expect(c.absences).toEqual({ absent: 3, late: 1 });
    expect(a.classSize).toBe(3);
  });

  it("école non franco-arabe : une seule section avec toutes les matières", () => {
    const single = buildClassReportCards(input({ francoArabic: false })).get("a")!;
    expect(single.sections).toHaveLength(1);
    expect(single.sections[0]!.subjects).toHaveLength(3);
    expect(single.sections[0]!.average).toBe(13.47);
  });

  it("préscolaire : niveaux d'acquisition, sans moyenne, rang ni mention", () => {
    const card = buildClassReportCards(
      input({
        scale: "appreciation",
        francoArabic: false,
        subjects: [{ id: "la", name: "Langage", nameAr: null, track: "french", coefficient: 1 }],
        evaluations: [
          {
            subjectId: "la",
            kind: "devoir",
            maxScore: null,
            weight: 1,
            grades: [{ studentId: "a", status: "graded", score: null, acquisition: "in_progress" }],
          },
        ],
      }),
    ).get("a")!;
    expect(card.sections[0]!.subjects[0]).toMatchObject({ summary: "in_progress", average: null, rank: null });
    expect([card.general, card.rank, card.mention]).toEqual([null, null, null]);
  });
});
