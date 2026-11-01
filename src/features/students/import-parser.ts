import { normalizePhone } from "@/lib/phone";
import type { ImportRow, Relationship } from "./schemas";

/**
 * Lecture d'un fichier d'élèves (Excel ou CSV) tel que les écoles le préparent :
 * en-têtes en français, plus ou moins accentués, dates JJ/MM/AAAA ou au format Excel.
 * Fonction pure : testée sans navigateur.
 */

export type CellValue = string | number | boolean | Date | null | undefined;

export type ImportField = Field;

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
  /** Pas de colonne Classe : la classe est le nom de la feuille. */
  classFromSheet: boolean;
  missingRequired: Field[];
  valid: ImportRow[];
  invalid: { row: number; issues: ImportIssue[]; label: string }[];
  /** Ligne du tableur (et feuille, s'il y en a plusieurs) de chaque numéro de ligne. */
  lines: Map<number, { line: number; sheet: string | null }>;
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
/** Mots qui désignent un numéro de téléphone (« Cel. papa », « GSM mère », « WhatsApp tuteur »…). */
const PHONE = "(telephone|tel|portable|contact|numero|cel|cell|cellulaire|mobile|gsm|whatsapp)s?";

/**
 * Synonymes d'en-têtes rencontrés dans les fichiers des écoles. L'ordre compte (le plus précis d'abord).
 * Le père (ou le parent 1) va en parent 1, la mère (ou le parent 2) en parent 2.
 */
const HEADER_PATTERNS: [RegExp, Field][] = [
  [
    new RegExp(
      `^${PHONE} (du |de la )?(parent|tuteur|pere|mere)? ?2$|^(telephone|tel|contact) (2e|second) parent$|^(parent|tuteur) 2 ${PHONE}$|^${PHONE}( de la)? (mere|maman)$`,
    ),
    "guardian2Phone",
  ],
  [
    /^(nom )?(du |de la )?(parent|tuteur|tutrice) ?2$|^nom (2e|second) parent$|^(parent|tuteur) 2 (nom|nom et prenoms?|nom complet)$|^(nom )?(et prenoms? )?(de la )?(mere|maman)$/,
    "guardian2Name",
  ],
  [/^lien( de parente)?( du)?( parent)? ?2$|^(parent|tuteur) 2 lien( de parente)?$/, "guardian2Relationship"],
  // « Parent 1 - Téléphone » : le numéro 1 est facultatif.
  [new RegExp(`^${PHONE}( du| de la)?( parent| tuteur| pere| papa)?( 1)?$|^(parent|tuteur)( 1)? ${PHONE}$`), "guardian1Phone"],
  [
    /^(nom )?(et prenoms? )?(du |de la )?(parent|tuteur|tutrice|pere|papa)( 1)?$|^nom (du )?parent( 1)?$|^(parent|tuteur)( 1)? (nom|nom et prenoms?|nom complet)$/,
    "guardian1Name",
  ],
  [/^lien( de parente)?( du)?( parent)?( 1)?$|^qualite$|^(parent|tuteur)( 1)? lien( de parente)?$/, "guardian1Relationship"],
  [/^(prenom|prenoms)( de l eleve)?$/, "firstName"],
  [/^(nom (et )?prenoms?|prenoms? (et )?nom|nom complet|eleve|nom de l eleve et prenom)$/, "fullName"],
  [/^nom( de famille)?( de l eleve)?$/, "lastName"],
  [/^(sexe|genre|s)$/, "sex"],
  [/^(date de naissance|date naissance|ne le|nee le|ne e le|naissance|date nais)$/, "birthDate"],
  [/^(lieu de naissance|lieu naissance|ne a|nee a|lieu)$/, "birthPlace"],
  [/^(classe|class|niveau classe)$/, "className"],
  [/^(matricule|n matricule|numero matricule|id|identifiant)$/, "matricule"],
  [/^(nationalite)$/, "nationality"],
];

/** Colonnes qui n'ont pas leur place dans une fiche élève (numéro d'ordre, remarques) : écartées d'office. */
const IGNORED_HEADERS = /^(n|no|num|n ordre|numero d ordre|ordre|rang|#|observations?|remarques?|commentaires?|obs)$/;

export function isIgnoredHeader(key: string): boolean {
  return IGNORED_HEADERS.test(key.replace(/#\d+$/, ""));
}

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

/** Feuille d'un classeur (un fichier CSV n'en a qu'une, sans nom). */
export type ImportSheet = { name: string; rows: CellValue[][] };

/**
 * Association des colonnes du fichier aux champs de Fama School. La clé est l'en-tête normalisé
 * (« telephone », « telephone#2 » pour un en-tête répété) : elle vaut pour toutes les feuilles et d'un import à
 * l'autre. null : colonne ignorée.
 */
export type ColumnMapping = Record<string, Field | null>;

/** Colonne du fichier telle que l'écran d'association la présente. */
export type ImportColumn = { key: string; label: string; samples: string[] };

/** Choix proposés à l'écran d'association, dans l'ordre d'une fiche d'inscription. */
export const IMPORT_FIELDS: readonly Field[] = [
  "fullName",
  "lastName",
  "firstName",
  "sex",
  "className",
  "birthDate",
  "birthPlace",
  "nationality",
  "matricule",
  "guardian1Name",
  "guardian1Phone",
  "guardian1Relationship",
  "guardian2Name",
  "guardian2Phone",
  "guardian2Relationship",
];

const isBlank = (cell: CellValue) => text(cell) === "" && !(cell instanceof Date) && typeof cell !== "number";

/** Lignes parcourues pour trouver les titres : au-delà, ce sont des élèves. */
const HEADER_SCAN_ROWS = 15;

/**
 * Ligne des titres (index à partir de 0, -1 si la feuille est vide). Souvent la première, mais beaucoup de
 * fichiers commencent par le nom de l'école ou l'année : on garde la ligne qui ressemble le plus à des titres.
 */
export function findHeaderRow(rows: CellValue[][]): number {
  let best = -1;
  let bestScore = 0;
  rows.slice(0, HEADER_SCAN_ROWS).forEach((cells, index) => {
    const labels = cells.filter((cell) => typeof cell === "string" && normalizeHeader(cell)).length;
    const score = mapHeaders(cells).filter(Boolean).length * 10 + labels;
    if (labels >= 2 && score > bestScore) {
      best = index;
      bestScore = score;
    }
  });
  return best >= 0 ? best : rows.findIndex((cells) => !cells.every(isBlank));
}

function columnKeys(headerRow: CellValue[]): string[] {
  const seen = new Map<string, number>();
  return headerRow.map((cell) => {
    const base = normalizeHeader(cell);
    if (!base) return "";
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}#${count}`;
  });
}

const sampleText = (value: CellValue) =>
  value instanceof Date ? `${pad(value.getUTCDate())}/${pad(value.getUTCMonth() + 1)}/${value.getUTCFullYear()}` : text(value);

/**
 * Colonnes de toutes les feuilles, avec trois exemples chacune, et leur association : celle que l'école a
 * déjà choisie (saved) sinon celle que l'on devine d'après l'en-tête. Un champ n'est associé qu'une fois.
 */
export function analyzeColumns(
  sheets: ImportSheet[],
  saved: ColumnMapping = {},
): { columns: ImportColumn[]; mapping: ColumnMapping } {
  const columns = new Map<string, ImportColumn>();
  const detected = new Map<string, Field | null>();

  for (const sheet of sheets) {
    const headerIndex = findHeaderRow(sheet.rows);
    if (headerIndex < 0) continue;
    const header = sheet.rows[headerIndex]!;
    const guesses = mapHeaders(header);
    columnKeys(header).forEach((key, position) => {
      if (!key) return;
      const column = columns.get(key) ?? { key, label: text(header[position]), samples: [] };
      for (const cells of sheet.rows.slice(headerIndex + 1)) {
        if (column.samples.length >= 3) break;
        const value = sampleText(cells[position]);
        if (value && !column.samples.includes(value)) column.samples.push(value);
      }
      columns.set(key, column);
      if (!detected.has(key)) detected.set(key, guesses[position] ?? null);
    });
  }

  const mapping: ColumnMapping = {};
  const taken = new Set<Field>();
  for (const key of columns.keys()) {
    if (key in saved) {
      mapping[key] = saved[key] ?? null;
      if (saved[key]) taken.add(saved[key]);
    }
  }
  for (const [key, field] of detected) {
    if (key in mapping) continue;
    mapping[key] = field && !taken.has(field) ? field : null;
    if (field) taken.add(field);
  }
  return { columns: [...columns.values()], mapping };
}

/** Associe une colonne à un champ ; la colonne qui l'avait jusque-là est libérée. */
export function assignColumn(mapping: ColumnMapping, key: string, field: Field | null): ColumnMapping {
  const next: ColumnMapping = {};
  for (const [other, current] of Object.entries(mapping)) next[other] = field && current === field ? null : current;
  next[key] = field;
  return next;
}

/** Noms de feuilles donnés par Excel (« Feuil1 », « Sheet2 ») : ce ne sont pas des classes. */
const GENERIC_SHEET = /^(feuil(le)?|sheet|tabelle|hoja|onglet)\s*\d*$/i;

/**
 * Sans colonne Classe, un classeur rangé avec une feuille par classe donne la classe de chaque élève par le
 * nom de sa feuille.
 */
export function classFromSheetNames(sheets: ImportSheet[], mapping: ColumnMapping): boolean {
  return (
    !Object.values(mapping).includes("className") &&
    sheets.length > 0 &&
    sheets.every((sheet) => sheet.name.trim() !== "" && !GENERIC_SHEET.test(sheet.name.trim()))
  );
}

export function missingFields(sheets: ImportSheet[], mapping: ColumnMapping): Field[] {
  const mapped = new Set(Object.values(mapping));
  const hasName = mapped.has("fullName") || (mapped.has("firstName") && mapped.has("lastName"));
  return [
    ...(hasName ? [] : (["firstName", "lastName"] as Field[])),
    ...(mapped.has("className") || classFromSheetNames(sheets, mapping) ? [] : (["className"] as Field[])),
    ...(mapped.has("sex") ? [] : (["sex"] as Field[])),
  ];
}

export function parseImport(sheets: ImportSheet[], mapping: ColumnMapping): ParsedImport {
  const classFromSheet = classFromSheetNames(sheets, mapping);
  const valid: ImportRow[] = [];
  const invalid: ParsedImport["invalid"] = [];
  const lines: ParsedImport["lines"] = new Map();
  // Numéro unique de chaque ligne, toutes feuilles confondues (avec une seule feuille : la ligne du tableur).
  let offset = 0;

  for (const sheet of sheets) {
    const headerIndex = findHeaderRow(sheet.rows);
    if (headerIndex < 0) continue;
    const fields = columnKeys(sheet.rows[headerIndex]!).map((key) => (key ? (mapping[key] ?? null) : null));
    const sheetName = sheets.length > 1 ? sheet.name : null;

    sheet.rows.slice(headerIndex + 1).forEach((cells, index) => {
      const line = headerIndex + index + 2; // ligne du tableur, à partir de 1
      const rowNumber = offset + line;
      if (cells.every(isBlank)) return;
      lines.set(rowNumber, { line, sheet: sheetName });

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
      const className = text(get("className")) || (classFromSheet ? sheet.name.trim() : "");
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

      const label = [firstName, lastName].filter(Boolean).join(" ") || `Ligne ${line}`;
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
    offset += sheet.rows.length + 1;
  }

  return { classFromSheet, missingRequired: missingFields(sheets, mapping), valid, invalid, lines };
}

/** Modèle CSV proposé au téléchargement (séparateur « ; » : Excel en français l'ouvre directement). */
export const IMPORT_TEMPLATE_CSV = [
  "Nom;Prénom;Sexe;Date de naissance;Lieu de naissance;Classe;Matricule;Nom du parent;Téléphone du parent;Lien;Nom du parent 2;Téléphone du parent 2;Lien parent 2",
  "Diop;Awa;F;14/03/2015;Dakar;CM2 A;;Moussa Diop;77 123 45 67;Père;Fatou Sow;76 987 65 43;Mère",
].join("\r\n");

/** Même table que private.name_key (base) : minuscules, sans accents, espaces simples. */
const ACCENTED = "àáâãäåçèéêëìíîïñòóôõöùúûüýÿœæ";
const PLAIN = "aaaaaaceeeeiiiinooooouuuuyyoa";

export function nameKey(value: string): string {
  return [...value.toLowerCase()]
    .map((char) => {
      const index = ACCENTED.indexOf(char);
      return index >= 0 ? PLAIN[index] : char;
    })
    .join("")
    .trim()
    .replace(/\s+/g, " ");
}

/** Élève déjà inscrit dans l'école, pour la détection des doublons. */
export type ExistingStudent = {
  firstName: string;
  lastName: string;
  birthDate: string | null;
  /** Classe de l'année en cours (null : pas inscrit cette année). */
  className: string | null;
};

export type DuplicateMatch = { row: ImportRow; existing: ExistingStudent | null };

const sameClass = (a: string | null, b: string | null) => a !== null && b !== null && nameKey(a) === nameKey(b);

/**
 * Règle de import_students (base) : mêmes prénom et nom, et même date de naissance si les deux sont
 * connues, sinon même classe cette année. Une ligne qui répète une ligne précédente du fichier est aussi
 * un doublon (existing = null).
 */
export function findDuplicates(rows: ImportRow[], existing: ExistingStudent[]): DuplicateMatch[] {
  const matches = (row: ImportRow, other: ExistingStudent) =>
    nameKey(other.firstName) === nameKey(row.student.first_name) &&
    nameKey(other.lastName) === nameKey(row.student.last_name) &&
    (other.birthDate && row.student.birth_date
      ? other.birthDate === row.student.birth_date
      : sameClass(other.className, row.className));

  const seen: ExistingStudent[] = [];
  const duplicates: DuplicateMatch[] = [];
  for (const row of rows) {
    const known = existing.find((other) => matches(row, other));
    if (known) duplicates.push({ row, existing: known });
    else if (seen.some((other) => matches(row, other))) duplicates.push({ row, existing: null });
    seen.push({
      firstName: row.student.first_name,
      lastName: row.student.last_name,
      birthDate: row.student.birth_date,
      className: row.className,
    });
  }
  return duplicates;
}
