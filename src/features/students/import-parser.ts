import { normalizePhone } from "@/lib/phone";
import type { ImportRow, Relationship } from "./schemas";

/**
 * Lecture d'un fichier d'élèves (Excel ou CSV) tel que les écoles le préparent :
 * en-têtes en français, plus ou moins accentués, dates JJ/MM/AAAA ou au format Excel.
 * Fonction pure : testée sans navigateur.
 */

export type CellValue = string | number | boolean | Date | null | undefined;

type Field =
  | "lastName"
  | "firstName"
  | "fullName"
  | "sex"
  | "birthDate"
  | "birthPlace"
  | "className"
  | "matricule"
  | "nationality"
  | "guardian1Name"
  | "guardian1Phone"
  | "guardian1Relationship"
  | "guardian2Name"
  | "guardian2Phone"
  | "guardian2Relationship";

export type ImportIssue = "missingName" | "missingClass" | "invalidSex" | "invalidDate" | "invalidPhone";

export type ParsedImport = {
  /** Champs reconnus dans l'en-tête (pour l'aperçu des colonnes). */
  columns: Field[];
  missingRequired: Field[];
  valid: ImportRow[];
  invalid: { row: number; issues: ImportIssue[]; label: string }[];
};

const normalizeHeader = (value: CellValue) =>
  String(value ?? "")
    // Les ligatures (sœur, cœur) ne se décomposent pas avec NFD.
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Synonymes d'en-têtes rencontrés dans les fichiers des écoles. L'ordre compte (le plus précis d'abord). */
const HEADER_PATTERNS: [RegExp, Field][] = [
  [
    /^(telephone|tel|portable|contact|numero)s? (du |de la )?(parent|tuteur|pere|mere)? ?2$|^(telephone|tel|contact) (2e|second) parent$/,
    "guardian2Phone",
  ],
  [/^(nom )?(du |de la )?(parent|tuteur|tutrice) ?2$|^nom (2e|second) parent$|^parent 2 nom$/, "guardian2Name"],
  [/^lien( de parente)?( du)?( parent)? ?2$/, "guardian2Relationship"],
  [/^(telephone|tel|portable|contact|numero)s?( du| de la)?( parent| tuteur| pere| mere)?( 1)?$/, "guardian1Phone"],
  [/^(nom )?(du |de la )?(parent|tuteur|tutrice|pere|mere)( 1)?$|^nom (du )?parent( 1)?$|^parent 1 nom$/, "guardian1Name"],
  [/^lien( de parente)?( du)?( parent)?( 1)?$|^qualite$/, "guardian1Relationship"],
  [/^(prenom|prenoms)( de l eleve)?$/, "firstName"],
  [/^(nom et prenoms?|prenom et nom|nom complet|eleve|nom de l eleve et prenom)$/, "fullName"],
  [/^nom( de famille)?( de l eleve)?$/, "lastName"],
  [/^(sexe|genre|s)$/, "sex"],
  [/^(date de naissance|date naissance|ne le|nee le|ne e le|naissance|date nais)$/, "birthDate"],
  [/^(lieu de naissance|lieu naissance|ne a|nee a|lieu)$/, "birthPlace"],
  [/^(classe|class|niveau classe)$/, "className"],
  [/^(matricule|n matricule|numero matricule|id|identifiant)$/, "matricule"],
  [/^(nationalite)$/, "nationality"],
];

export function mapHeaders(headerRow: CellValue[]): (Field | null)[] {
  const used = new Set<Field>();
  return headerRow.map((cell) => {
    const header = normalizeHeader(cell);
    const match = HEADER_PATTERNS.find(([pattern, field]) => !used.has(field) && pattern.test(header));
    if (!match) return null;
    used.add(match[1]);
    return match[1];
  });
}

export function parseSex(value: CellValue): "F" | "M" | null {
  const text = normalizeHeader(value);
  if (/^(f|fille|feminin|femme|female)$/.test(text)) return "F";
  if (/^(m|g|garcon|masculin|homme|male)$/.test(text)) return "M";
  return null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** JJ/MM/AAAA, JJ-MM-AAAA, AAAA-MM-JJ, nombre de série Excel ou objet Date. */
export function parseDate(value: CellValue): string | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  let year: number;
  let month: number;
  let day: number;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "invalid";
    [year, month, day] = [value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate()];
  } else if (typeof value === "number") {
    // Série Excel : jours depuis le 30/12/1899.
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86_400_000);
    [year, month, day] = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
  } else {
    const text = String(value).trim();
    const fr = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})$/.exec(text);
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
    if (fr) {
      [day, month, year] = [Number(fr[1]), Number(fr[2]), Number(fr[3])];
      if (year < 100) year += year > 50 ? 1900 : 2000;
    } else if (iso) {
      [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    } else {
      return "invalid";
    }
  }

  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return "invalid";
  if (year < 1980 || year > 2030) return "invalid";
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseRelationship(value: CellValue, fallback: Relationship): Relationship {
  const text = normalizeHeader(value);
  if (!text) return fallback;
  if (/^pere|papa/.test(text)) return "father";
  if (/^mere|maman/.test(text)) return "mother";
  // La fratrie avant les grands-parents : « grande sœur » n'est pas une grand-mère.
  if (/^(grand |grande )?(frere|soeur)/.test(text)) return "sibling";
  if (/^grand/.test(text)) return "grandparent";
  if (/^oncle/.test(text)) return "uncle";
  if (/^tante/.test(text)) return "aunt";
  if (/^tut/.test(text)) return "guardian";
  return "other";
}

const text = (value: CellValue) =>
  value instanceof Date
    ? ""
    : String(value ?? "")
        .replace(/\s+/g, " ")
        .trim();

/** « DIOP Awa » / « Awa DIOP » → prénom + nom (le nom en majuscules est le nom de famille). */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.split(" ").filter(Boolean);
  if (parts.length < 2) return { firstName: parts[0] ?? "", lastName: "" };
  const upper = parts.filter((part) => part.length > 1 && part === part.toLocaleUpperCase("fr") && /\p{L}/u.test(part));
  if (upper.length > 0 && upper.length < parts.length) {
    return { lastName: upper.join(" "), firstName: parts.filter((part) => !upper.includes(part)).join(" ") };
  }
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1)! };
}

/** Met en forme « DIOP » → « Diop », « ndeye fatou » → « Ndeye Fatou ». */
export function titleCase(value: string): string {
  return value
    .toLocaleLowerCase("fr")
    .replace(/(^|[\s'-])(\p{L})/gu, (_, separator: string, letter: string) => separator + letter.toLocaleUpperCase("fr"));
}

export function parseImport(sheet: CellValue[][]): ParsedImport {
  const [headerRow = [], ...rows] = sheet;
  const fields = mapHeaders(headerRow);
  const columns = fields.filter((field): field is Field => field !== null);
  const hasName = columns.includes("fullName") || (columns.includes("firstName") && columns.includes("lastName"));
  const missingRequired: Field[] = [
    ...(hasName ? [] : (["firstName", "lastName"] as Field[])),
    ...(columns.includes("className") ? [] : (["className"] as Field[])),
    ...(columns.includes("sex") ? [] : (["sex"] as Field[])),
  ];

  const valid: ImportRow[] = [];
  const invalid: ParsedImport["invalid"] = [];

  rows.forEach((cells, index) => {
    const rowNumber = index + 2; // ligne du tableur (l'en-tête est la ligne 1)
    if (cells.every((cell) => text(cell) === "" && !(cell instanceof Date) && typeof cell !== "number")) return;

    const get = (field: Field) => {
      const position = fields.indexOf(field);
      return position >= 0 ? cells[position] : undefined;
    };

    let firstName = titleCase(text(get("firstName")));
    let lastName = titleCase(text(get("lastName")));
    if ((!firstName || !lastName) && text(get("fullName"))) {
      const split = splitFullName(text(get("fullName")));
      firstName = firstName || titleCase(split.firstName);
      lastName = lastName || titleCase(split.lastName);
    }

    const issues: ImportIssue[] = [];
    if (!firstName || !lastName) issues.push("missingName");
    const className = text(get("className"));
    if (!className) issues.push("missingClass");
    const sex = parseSex(get("sex"));
    if (!sex) issues.push("invalidSex");
    const birthDate = parseDate(get("birthDate"));
    if (birthDate === "invalid") issues.push("invalidDate");

    const guardians: ImportRow["guardians"] = [];
    for (const n of [1, 2] as const) {
      const name = titleCase(text(get(`guardian${n}Name`)));
      const rawPhone = text(get(`guardian${n}Phone`));
      const phone = rawPhone ? normalizePhone(rawPhone) : null;
      if (rawPhone && !phone) issues.push("invalidPhone");
      if (name || phone) {
        guardians.push({
          full_name: name || `${n === 1 ? "Parent" : "Second parent"} de ${firstName}`.trim(),
          phone,
          relationship: parseRelationship(get(`guardian${n}Relationship`), n === 1 ? "father" : "mother"),
        });
      }
    }

    const label = [firstName, lastName].filter(Boolean).join(" ") || `Ligne ${rowNumber}`;
    if (issues.length > 0) {
      invalid.push({ row: rowNumber, issues: [...new Set(issues)], label });
      return;
    }

    valid.push({
      row: rowNumber,
      className,
      student: {
        first_name: firstName,
        last_name: lastName,
        sex: sex!,
        birth_date: birthDate === "invalid" ? null : birthDate,
        birth_place: titleCase(text(get("birthPlace"))) || null,
        nationality: text(get("nationality")) || null,
        matricule: text(get("matricule")) || null,
      },
      guardians,
    });
  });

  return { columns, missingRequired, valid, invalid };
}

/** Modèle CSV proposé au téléchargement (séparateur « ; » : Excel en français l'ouvre directement). */
export const IMPORT_TEMPLATE_CSV = [
  "Nom;Prénom;Sexe;Date de naissance;Lieu de naissance;Classe;Matricule;Nom du parent;Téléphone du parent;Lien;Nom du parent 2;Téléphone du parent 2;Lien parent 2",
  "Diop;Awa;F;14/03/2015;Dakar;CM2 A;;Moussa Diop;77 123 45 67;Père;Fatou Sow;76 987 65 43;Mère",
].join("\r\n");
