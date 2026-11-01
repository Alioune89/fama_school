import { describe, expect, it } from "vitest";
import {
  findDuplicates,
  mapHeaders,
  nameKey,
  parseDate,
  analyzeColumns,
  assignColumn,
  findHeaderRow,
  isIgnoredHeader,
  parseImport,
  parseRelationship,
  parseSex,
  splitFullName,
  titleCase,
} from "./import-parser";
import type { ImportRow } from "./schemas";
import type { CellValue } from "./import-parser";

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

  it("reconnaît les en-têtes « Parent 1 - Téléphone », « Parent 2 - Lien »…", () => {
    expect(
      mapHeaders([
        "Nom et prénoms *",
        "Parent 1 - Nom",
        "Parent 1 -\nTéléphone",
        "Parent 1 - Lien",
        "Parent 2 - Nom",
        "Parent 2 - Téléphone",
        "Parent 2 - Lien",
      ]),
    ).toEqual([
      "fullName",
      "guardian1Name",
      "guardian1Phone",
      "guardian1Relationship",
      "guardian2Name",
      "guardian2Phone",
      "guardian2Relationship",
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

/** Une feuille, colonnes devinées d'après les en-têtes. */
const parse = (rows: CellValue[][]) => {
  const sheets = [{ name: "", rows }];
  return parseImport(sheets, analyzeColumns(sheets).mapping);
};

describe("parseImport", () => {
  const header = ["Nom", "Prénom", "Sexe", "Date de naissance", "Classe", "Nom du parent", "Téléphone du parent", "Lien"];

  it("produit des lignes prêtes à importer et numérote comme le tableur", () => {
    const result = parse([
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
    const result = parse([
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
    const result = parse([
      ["Nom et prénoms", "Sexe", "Classe"],
      ["", "", ""],
      ["NDIAYE Mame Diarra", "F", "CE2 A"],
    ]);
    expect(result.valid.map((row) => `${row.student.first_name} ${row.student.last_name}`)).toEqual(["Mame Diarra Ndiaye"]);
  });

  it("indique les colonnes obligatoires absentes", () => {
    expect(parse([["Nom", "Prénom"]]).missingRequired).toEqual(["className", "sex"]);
  });
});

describe("fichiers des écoles, tels quels", () => {
  it("trouve la ligne des titres sous le nom de l'école et l'année", () => {
    const rows: CellValue[][] = [
      ["GROUPE SCOLAIRE LES BAOBABS"],
      ["Année scolaire 2026-2027", null],
      [],
      ["N°", "NOM & PRENOMS", "SEXE", "CLASSE"],
      [1, "DIOP Awa", "F", "CM2 A"],
    ];
    expect(findHeaderRow(rows)).toBe(3);
    const result = parse(rows);
    expect(result.valid.map((row) => [row.row, row.student.first_name, row.className])).toEqual([[5, "Awa", "CM2 A"]]);
  });

  it("présente chaque colonne avec des exemples et laisse l'école associer celles qu'on ne devine pas", () => {
    const sheets = [
      {
        name: "",
        rows: [
          ["Élève", "Genre", "Classe", "Personne à prévenir", "Observations"],
          ["DIOP Awa", "F", "CM2 A", "77 123 45 67", "RAS"],
          ["FALL Modou", "G", "CM2 A", "76 987 65 43", ""],
        ],
      },
    ];
    const { columns, mapping } = analyzeColumns(sheets);
    expect(columns.find((column) => column.key === "personne a prevenir")).toEqual({
      key: "personne a prevenir",
      label: "Personne à prévenir",
      samples: ["77 123 45 67", "76 987 65 43"],
    });
    expect(mapping).toEqual({
      eleve: "fullName",
      genre: "sex",
      classe: "className",
      "personne a prevenir": null,
      observations: null,
    });

    const chosen = assignColumn(mapping, "personne a prevenir", "guardian1Phone");
    expect(parseImport(sheets, chosen).valid[0]!.guardians[0]!.phone).toBe("+221771234567");
  });

  it("reconnaît « Cel. papa », « GSM maman », « Nom de la mère »", () => {
    expect(mapHeaders(["Nom du père", "Cel. papa", "Nom de la mère", "GSM maman", "WhatsApp tuteur"])).toEqual([
      "guardian1Name",
      "guardian1Phone",
      "guardian2Name",
      "guardian2Phone",
      null,
    ]);
    expect(mapHeaders(["Tél. mère"])).toEqual(["guardian2Phone"]);
  });

  it("écarte d'office le numéro d'ordre et les observations", () => {
    expect(["n", "observations", "remarque", "n#2"].map(isIgnoredHeader)).toEqual([true, true, true, true]);
    expect(isIgnoredHeader("cel papa")).toBe(false);
  });

  it("n'associe un champ qu'à une colonne", () => {
    const mapping = { tel: "guardian1Phone", portable: null } as const;
    expect(assignColumn(mapping, "portable", "guardian1Phone")).toEqual({ tel: null, portable: "guardian1Phone" });
  });

  it("reprend les choix déjà faits par l'école, avant ce que l'on devine", () => {
    const sheets = [{ name: "", rows: [["Nom", "Prénom", "Sexe", "Classe", "Cel. papa", "Téléphone"]] }];
    const { mapping } = analyzeColumns(sheets, { "cel papa": "guardian1Phone", telephone: null });
    expect(mapping["cel papa"]).toBe("guardian1Phone");
    expect(mapping.telephone).toBeNull();
  });

  it("lit toutes les feuilles et prend la classe du nom de la feuille", () => {
    const sheets = [
      {
        name: "CM2 A",
        rows: [
          ["Nom", "Prénom", "Sexe"],
          ["Diop", "Awa", "F"],
        ],
      },
      { name: "CM2 B", rows: [["LISTE DE LA CLASSE"], ["Nom", "Prénom", "Sexe"], ["Fall", "Modou", "G"]] },
    ];
    const result = parseImport(sheets, analyzeColumns(sheets).mapping);
    expect(result.classFromSheet).toBe(true);
    expect(result.missingRequired).toEqual([]);
    expect(result.valid.map((row) => [row.student.first_name, row.className])).toEqual([
      ["Awa", "CM2 A"],
      ["Modou", "CM2 B"],
    ]);
    // Numéros uniques d'une feuille à l'autre, ligne du tableur conservée pour l'affichage.
    const [first, second] = result.valid.map((row) => row.row);
    expect(first).not.toBe(second);
    expect(result.lines.get(second!)).toEqual({ line: 3, sheet: "CM2 B" });
  });

  it("ne prend pas « Feuil1 » pour une classe", () => {
    const sheets = [
      {
        name: "Feuil1",
        rows: [
          ["Nom", "Prénom", "Sexe"],
          ["Diop", "Awa", "F"],
        ],
      },
    ];
    expect(parseImport(sheets, analyzeColumns(sheets).mapping).missingRequired).toEqual(["className"]);
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
