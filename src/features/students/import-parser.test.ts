import { describe, expect, it } from "vitest";
import {
  findDuplicates,
  mapHeaders,
  nameKey,
  parseDate,
  parseImport,
  parseRelationship,
  parseSex,
  splitFullName,
  titleCase,
} from "./import-parser";
import type { ImportRow } from "./schemas";

describe("mapHeaders", () => {
  it("reconnaît les en-têtes usuels, accents et majuscules compris", () => {
    expect(
      mapHeaders([
        "NOM",
        "Prénoms",
        "Sexe",
        "Date de naissance",
        "Lieu de naissance",
        "Classe",
        "Téléphone du parent",
        "Nom du parent",
        "Lien de parenté",
      ]),
    ).toEqual([
      "lastName",
      "firstName",
      "sex",
      "birthDate",
      "birthPlace",
      "className",
      "guardian1Phone",
      "guardian1Name",
      "guardian1Relationship",
    ]);
  });

  it("distingue le premier et le second parent", () => {
    expect(mapHeaders(["Nom du parent", "Téléphone", "Nom du parent 2", "Téléphone du parent 2"])).toEqual([
      "guardian1Name",
      "guardian1Phone",
      "guardian2Name",
      "guardian2Phone",
    ]);
  });

  it("ignore les colonnes inconnues", () => {
    expect(mapHeaders(["Observation", "Classe"])).toEqual([null, "className"]);
  });
});

describe("valeurs", () => {
  it.each([
    ["F", "F"],
    ["fille", "F"],
    ["Féminin", "F"],
    ["G", "M"],
    ["Garçon", "M"],
    ["masculin", "M"],
    ["?", null],
  ])("sexe « %s » → %s", (input, expected) => {
    expect(parseSex(input)).toBe(expected);
  });

  it.each([
    ["14/03/2015", "2015-03-14"],
    ["4-9-2016", "2016-09-04"],
    ["2014-12-01", "2014-12-01"],
    ["01/02/15", "2015-02-01"],
    [42077, "2015-03-14"],
    [new Date(Date.UTC(2015, 2, 14)), "2015-03-14"],
    ["", null],
    [null, null],
    ["31/02/2015", "invalid"],
    ["hier", "invalid"],
  ])("date « %s » → %s", (input, expected) => {
    expect(parseDate(input as never)).toBe(expected);
  });

  it.each([
    ["Père", "father"],
    ["MAMAN", "mother"],
    ["Grand-mère", "grandparent"],
    ["Oncle", "uncle"],
    ["Grande sœur", "sibling"],
    ["Grand-père", "grandparent"],
    ["Tutrice", "guardian"],
    ["voisin", "other"],
    ["", "father"],
  ])("lien « %s » → %s", (input, expected) => {
    expect(parseRelationship(input, "father")).toBe(expected);
  });

  it("sépare nom et prénom quand le nom est en majuscules", () => {
    expect(splitFullName("DIOP Awa")).toEqual({ firstName: "Awa", lastName: "DIOP" });
    expect(splitFullName("Mame Diarra NDIAYE")).toEqual({ firstName: "Mame Diarra", lastName: "NDIAYE" });
    expect(splitFullName("Moussa Fall")).toEqual({ firstName: "Moussa", lastName: "Fall" });
  });

  it("met les noms en forme", () => {
    expect(titleCase("NDEYE FATOU")).toBe("Ndeye Fatou");
    expect(titleCase("sow-ba")).toBe("Sow-Ba");
  });
});

describe("parseImport", () => {
  const header = ["Nom", "Prénom", "Sexe", "Date de naissance", "Classe", "Nom du parent", "Téléphone du parent", "Lien"];

  it("produit des lignes prêtes à importer et numérote comme le tableur", () => {
    const result = parseImport([
      header,
      ["DIOP", "awa", "F", "14/03/2015", "CM2 A", "moussa diop", "77 123 45 67", "Père"],
      ["Fall", "Modou", "G", 42077, "CM1 A", "", "221761234567", ""],
    ]);
    expect(result.missingRequired).toEqual([]);
    expect(result.invalid).toEqual([]);
    expect(result.valid).toEqual([
      {
        row: 2,
        className: "CM2 A",
        student: {
          first_name: "Awa",
          last_name: "Diop",
          sex: "F",
          birth_date: "2015-03-14",
          birth_place: null,
          nationality: null,
          matricule: null,
        },
        guardians: [{ full_name: "Moussa Diop", phone: "+221771234567", relationship: "father" }],
      },
      {
        row: 3,
        className: "CM1 A",
        student: {
          first_name: "Modou",
          last_name: "Fall",
          sex: "M",
          birth_date: "2015-03-14",
          birth_place: null,
          nationality: null,
          matricule: null,
        },
        guardians: [{ full_name: "Parent de Modou", phone: "+221761234567", relationship: "father" }],
      },
    ]);
  });

  it("signale chaque ligne invalide avec ses problèmes, sans bloquer les autres", () => {
    const result = parseImport([
      header,
      ["Ba", "", "X", "31/02/2015", "", "", "123", ""],
      ["Sarr", "Ibrahima", "M", "", "6e A", "", "", ""],
    ]);
    expect(result.invalid).toEqual([
      { row: 2, issues: ["missingName", "missingClass", "invalidSex", "invalidDate", "invalidPhone"], label: "Ba" },
    ]);
    expect(result.valid).toHaveLength(1);
  });

  it("ignore les lignes vides et accepte une colonne « Nom et prénoms »", () => {
    const result = parseImport([
      ["Nom et prénoms", "Sexe", "Classe"],
      ["", "", ""],
      ["NDIAYE Mame Diarra", "F", "CE2 A"],
    ]);
    expect(result.valid.map((row) => `${row.student.first_name} ${row.student.last_name}`)).toEqual(["Mame Diarra Ndiaye"]);
  });

  it("indique les colonnes obligatoires absentes", () => {
    expect(parseImport([["Nom", "Prénom"]]).missingRequired).toEqual(["className", "sex"]);
  });
});

describe("findDuplicates", () => {
  const row = (n: number, first: string, last: string, birthDate: string | null, className = "CM2 A"): ImportRow => ({
    row: n,
    className,
    student: {
      first_name: first,
      last_name: last,
      sex: "F",
      birth_date: birthDate,
      birth_place: null,
      nationality: null,
      matricule: null,
    },
    guardians: [],
  });
  const existing = [
    { firstName: "Aïda", lastName: "Diop", birthDate: "2015-03-14", className: "CM2 A" },
    { firstName: "Malick", lastName: "Sy", birthDate: null, className: "CM2 A" },
  ];

  it("ignore casse, accents et espaces dans les noms", () => {
    expect(nameKey("  NDÈYE   Fatou ")).toBe("ndeye fatou");
  });

  it("repère un élève déjà inscrit : même date de naissance, ou même classe sans date", () => {
    const rows = [
      row(2, "AIDA", "diop", "2015-03-14", "CM1 A"),
      row(3, "Malick", "Sy", null, "cm2  a"),
      row(4, "Malick", "Sy", null, "CM1 A"),
      row(5, "Aïda", "Diop", "2016-01-02"),
    ];
    expect(findDuplicates(rows, existing).map((match) => [match.row.row, match.existing?.firstName])).toEqual([
      [2, "Aïda"],
      [3, "Malick"],
    ]);
  });

  it("repère un élève présent deux fois dans le fichier", () => {
    const rows = [row(2, "Fatou", "Ndiaye", "2016-05-05"), row(3, "Fatou", "Ndiaye", "2016-05-05")];
    expect(findDuplicates(rows, [])).toEqual([{ row: rows[1], existing: null }]);
  });
});
