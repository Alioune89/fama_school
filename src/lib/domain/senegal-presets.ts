import type { Enums } from "@/lib/supabase/database.types";

/**
 * Préréglages pour les écoles sénégalaises : cycles, niveaux, matières et coefficients usuels.
 * Ce sont des valeurs de départ : chaque école les ajuste dans l'assistant de mise en route.
 */

export type CycleCode = Enums<"cycle_code">;
export type GradingScale = Enums<"grading_scale">;
export type SubjectTrack = Enums<"subject_track">;
export type Exam = "CFEE" | "BFEM" | "BAC";

export type LevelPreset = {
  code: string;
  label: string;
  series?: string;
  exam?: Exam;
};

export type CyclePreset = {
  code: CycleCode;
  label: string;
  gradingScale: GradingScale;
  levels: LevelPreset[];
};

/**
 * Coefficient d'une matière : valeur commune, éventuellement différente selon la série (lycée) ; 0 = matière non
 * enseignée dans cette série.
 */
export type CoefficientRule = { default: number; bySeries?: Partial<Record<string, number>> };

export type SubjectPreset = {
  name: string;
  shortName: string;
  group: string;
  track: SubjectTrack;
  nameAr?: string;
  coefficient: CoefficientRule;
  /** Niveaux concernés (codes) ; absent = tous les niveaux du cycle. */
  onlyLevels?: string[];
  /** Matière proposée mais décochée par défaut (langue vivante 2, arts…). */
  optional?: boolean;
};

/** Séries de Seconde (tronc commun littéraire ou scientifique). */
export const SECONDE_SERIES = ["L", "S"] as const;
/** Séries de Première et Terminale, par famille ; « L » et « S » restent acceptées pour les écoles déjà paramétrées ainsi. */
export const UPPER_SERIES_GROUPS = {
  literary: ["L1", "L2", "L'1", "LA"],
  scientific: ["S1", "S2", "S3", "S4", "S5"],
  technical: ["T1", "T2", "G"],
} as const;
export const UPPER_SERIES = [...UPPER_SERIES_GROUPS.literary, ...UPPER_SERIES_GROUPS.scientific, ...UPPER_SERIES_GROUPS.technical] as const;
export const LEGACY_UPPER_SERIES = ["L", "S"] as const;
export type SecondeSerie = (typeof SECONDE_SERIES)[number];
export type UpperSerie = (typeof UPPER_SERIES)[number] | (typeof LEGACY_UPPER_SERIES)[number];
export type LyceeSeries = { seconde: readonly SecondeSerie[]; upper: readonly UpperSerie[] };
export const DEFAULT_LYCEE_SERIES: LyceeSeries = { seconde: ["L", "S"], upper: ["L1", "L2", "S1", "S2"] };

export const CYCLE_PRESETS: CyclePreset[] = [
  {
    code: "prescolaire",
    label: "Préscolaire",
    gradingScale: "appreciation",
    levels: [
      { code: "PS", label: "Petite section" },
      { code: "MS", label: "Moyenne section" },
      { code: "GS", label: "Grande section" },
    ],
  },
  {
    code: "elementaire",
    label: "Élémentaire",
    gradingScale: "ten",
    levels: [
      { code: "CI", label: "Cours d'initiation" },
      { code: "CP", label: "Cours préparatoire" },
      { code: "CE1", label: "Cours élémentaire 1" },
      { code: "CE2", label: "Cours élémentaire 2" },
      { code: "CM1", label: "Cours moyen 1" },
      { code: "CM2", label: "Cours moyen 2", exam: "CFEE" },
    ],
  },
  {
    code: "moyen",
    label: "Moyen",
    gradingScale: "twenty",
    levels: [
      { code: "6e", label: "Sixième" },
      { code: "5e", label: "Cinquième" },
      { code: "4e", label: "Quatrième" },
      { code: "3e", label: "Troisième", exam: "BFEM" },
    ],
  },
  {
    code: "secondaire",
    label: "Secondaire",
    gradingScale: "twenty",
    levels: [
      { code: "2nde", label: "Seconde" },
      { code: "1ère", label: "Première" },
      { code: "Tle", label: "Terminale", exam: "BAC" },
    ],
  },
];

const one: CoefficientRule = { default: 1 };

export const SUBJECT_PRESETS: Record<CycleCode, SubjectPreset[]> = {
  prescolaire: [
    { name: "Langage et communication", shortName: "LANG", group: "Langage", track: "french", coefficient: one },
    { name: "Éveil mathématique", shortName: "MATHS", group: "Éveil", track: "french", coefficient: one },
    { name: "Éveil scientifique", shortName: "SCI", group: "Éveil", track: "french", coefficient: one },
    { name: "Activités graphiques", shortName: "GRAPH", group: "Arts", track: "french", coefficient: one },
    { name: "Activités artistiques", shortName: "ARTS", group: "Arts", track: "french", coefficient: one },
    { name: "Éducation physique", shortName: "EP", group: "Corps", track: "french", coefficient: one },
  ],
  elementaire: [
    { name: "Lecture", shortName: "LECT", group: "Langue et communication", track: "french", coefficient: one },
    { name: "Expression écrite", shortName: "EXPR", group: "Langue et communication", track: "french", coefficient: one },
    { name: "Grammaire", shortName: "GRAM", group: "Langue et communication", track: "french", coefficient: one, onlyLevels: ["CE1", "CE2", "CM1", "CM2"] },
    { name: "Conjugaison", shortName: "CONJ", group: "Langue et communication", track: "french", coefficient: one, onlyLevels: ["CE1", "CE2", "CM1", "CM2"] },
    { name: "Orthographe", shortName: "ORTH", group: "Langue et communication", track: "french", coefficient: one },
    { name: "Vocabulaire", shortName: "VOC", group: "Langue et communication", track: "french", coefficient: one },
    { name: "Récitation", shortName: "REC", group: "Langue et communication", track: "french", coefficient: one },
    { name: "Activités numériques", shortName: "NUM", group: "Mathématiques", track: "french", coefficient: one },
    { name: "Activités géométriques", shortName: "GEO", group: "Mathématiques", track: "french", coefficient: one },
    { name: "Activités de mesure", shortName: "MES", group: "Mathématiques", track: "french", coefficient: one },
    { name: "Résolution de problèmes", shortName: "PB", group: "Mathématiques", track: "french", coefficient: one, onlyLevels: ["CE1", "CE2", "CM1", "CM2"] },
    { name: "Histoire", shortName: "HIST", group: "Éducation à la science et à la vie sociale", track: "french", coefficient: one },
    { name: "Géographie", shortName: "GEOG", group: "Éducation à la science et à la vie sociale", track: "french", coefficient: one },
    { name: "Initiation scientifique et technologique", shortName: "IST", group: "Éducation à la science et à la vie sociale", track: "french", coefficient: one },
    { name: "Vivre ensemble", shortName: "VE", group: "Éducation à la science et à la vie sociale", track: "french", coefficient: one },
    { name: "Éducation physique et sportive", shortName: "EPS", group: "Arts et sport", track: "french", coefficient: one },
    { name: "Arts plastiques", shortName: "ARTS", group: "Arts et sport", track: "french", coefficient: one, optional: true },
    { name: "Anglais", shortName: "ANG", group: "Langue et communication", track: "french", coefficient: one, onlyLevels: ["CM1", "CM2"], optional: true },
  ],
  moyen: [
    { name: "Français", shortName: "FR", group: "Lettres", track: "french", coefficient: { default: 4 } },
    { name: "Mathématiques", shortName: "MATHS", group: "Sciences", track: "french", coefficient: { default: 4 } },
    { name: "Anglais", shortName: "ANG", group: "Langues", track: "french", coefficient: { default: 2 } },
    { name: "Espagnol", shortName: "ESP", group: "Langues", track: "french", coefficient: { default: 2 }, onlyLevels: ["4e", "3e"], optional: true },
    { name: "Histoire-Géographie", shortName: "HG", group: "Lettres", track: "french", coefficient: { default: 2 } },
    { name: "Sciences de la vie et de la Terre", shortName: "SVT", group: "Sciences", track: "french", coefficient: { default: 2 } },
    { name: "Sciences physiques", shortName: "PC", group: "Sciences", track: "french", coefficient: { default: 2 } },
    { name: "Éducation civique", shortName: "EC", group: "Lettres", track: "french", coefficient: one },
    { name: "Éducation physique et sportive", shortName: "EPS", group: "Arts et sport", track: "french", coefficient: one },
    { name: "Arts plastiques", shortName: "ARTS", group: "Arts et sport", track: "french", coefficient: one, optional: true },
  ],
  secondaire: [
    // Seconde : familles L et S. Première et Terminale : pondération indicative par série, dans l'esprit des épreuves
    // du BAC (S1 maths-physique, S2 sciences expérimentales, L2 philosophie et lettres, G gestion…), à ajuster par
    // chaque école.
    {
      name: "Français",
      shortName: "FR",
      group: "Lettres",
      track: "french",
      coefficient: { default: 3, bySeries: { L: 5, L1: 5, L2: 5, "L'1": 5, LA: 4, T1: 2, T2: 2 } },
    },
    {
      name: "Philosophie",
      shortName: "PHILO",
      group: "Lettres",
      track: "french",
      coefficient: { default: 2, bySeries: { L: 5, L1: 5, L2: 6, "L'1": 5, LA: 5 } },
      onlyLevels: ["1ère", "Tle"],
    },
    {
      name: "Mathématiques",
      shortName: "MATHS",
      group: "Sciences",
      track: "french",
      coefficient: { default: 2, bySeries: { S: 5, S1: 8, S2: 5, S3: 6, S4: 4, S5: 4, T1: 5, T2: 5, G: 4, LA: 1 } },
    },
    {
      name: "Sciences physiques",
      shortName: "PC",
      group: "Sciences",
      track: "french",
      coefficient: { default: 1, bySeries: { S: 5, S1: 8, S2: 6, S3: 6, S4: 4, S5: 4, T1: 5, T2: 5, L1: 0, L2: 0, "L'1": 0, LA: 0, G: 0 } },
    },
    {
      name: "Sciences de la vie et de la Terre",
      shortName: "SVT",
      group: "Sciences",
      track: "french",
      coefficient: { default: 2, bySeries: { S: 4, S1: 2, S2: 6, S3: 0, S4: 6, S5: 6, T1: 0, T2: 0, LA: 0, G: 0 } },
    },
    {
      name: "Histoire-Géographie",
      shortName: "HG",
      group: "Lettres",
      track: "french",
      coefficient: { default: 2, bySeries: { L: 4, L1: 4, L2: 5, "L'1": 4, LA: 4, G: 3 } },
    },
    {
      name: "Anglais",
      shortName: "ANG",
      group: "Langues",
      track: "french",
      coefficient: { default: 2, bySeries: { L: 4, L1: 4, L2: 4, "L'1": 4, LA: 3, G: 3 } },
    },
    {
      name: "Espagnol",
      shortName: "ESP",
      group: "Langues",
      track: "french",
      coefficient: { default: 2, bySeries: { L: 3, L1: 4, L2: 3, "L'1": 0, LA: 0, T1: 0, T2: 0 } },
      optional: true,
    },
    {
      name: "Arabe",
      shortName: "AR",
      group: "Langues",
      track: "french",
      coefficient: { default: 0, bySeries: { "L'1": 4, LA: 6 } },
    },
    {
      name: "Économie",
      shortName: "ECO",
      group: "Économie et gestion",
      track: "french",
      coefficient: { default: 0, bySeries: { G: 5 } },
    },
    {
      name: "Techniques de gestion et comptabilité",
      shortName: "GEST",
      group: "Économie et gestion",
      track: "french",
      coefficient: { default: 0, bySeries: { G: 6 } },
    },
    {
      name: "Technologie",
      shortName: "TECH",
      group: "Sciences et techniques",
      track: "french",
      coefficient: { default: 0, bySeries: { S3: 6, T1: 8, T2: 8 } },
    },
    { name: "Éducation physique et sportive", shortName: "EPS", group: "Arts et sport", track: "french", coefficient: one },
  ],
};

/** Filière arabe et éducation religieuse des écoles franco-arabes (bulletin double). */
export const ARABIC_SUBJECT_PRESETS: SubjectPreset[] = [
  { name: "Coran", nameAr: "القرآن الكريم", shortName: "COR", group: "Enseignement arabo-islamique", track: "arabic", coefficient: { default: 2 } },
  { name: "Tajwid", nameAr: "التجويد", shortName: "TAJ", group: "Enseignement arabo-islamique", track: "arabic", coefficient: one },
  { name: "Langue arabe", nameAr: "اللغة العربية", shortName: "AR", group: "Enseignement arabo-islamique", track: "arabic", coefficient: { default: 2 } },
  { name: "Fiqh", nameAr: "الفقه", shortName: "FIQH", group: "Enseignement arabo-islamique", track: "arabic", coefficient: one },
  { name: "Tawhid", nameAr: "التوحيد", shortName: "TAW", group: "Enseignement arabo-islamique", track: "arabic", coefficient: one },
  { name: "Hadith", nameAr: "الحديث", shortName: "HAD", group: "Enseignement arabo-islamique", track: "arabic", coefficient: one },
  { name: "Sîra", nameAr: "السيرة النبوية", shortName: "SIRA", group: "Enseignement arabo-islamique", track: "arabic", coefficient: one },
  { name: "Akhlaq", nameAr: "الأخلاق", shortName: "AKH", group: "Enseignement arabo-islamique", track: "arabic", coefficient: one },
];

export function cyclePreset(code: CycleCode): CyclePreset {
  const preset = CYCLE_PRESETS.find((cycle) => cycle.code === code);
  if (!preset) throw new Error(`Cycle inconnu : ${code}`);
  return preset;
}

/** Niveaux d'un cycle ; au lycée, un niveau par série choisie (2nde L, 2nde S, 1ère S1, Tle L2…). */
export function expandLevels(code: CycleCode, series: LyceeSeries = DEFAULT_LYCEE_SERIES): LevelPreset[] {
  const { levels } = cyclePreset(code);
  if (code !== "secondaire") return levels;
  return levels.flatMap((level) =>
    (level.code === "2nde" ? series.seconde : series.upper).map((serie) => ({ ...level, series: serie })),
  );
}

/** Famille d'une série pour les coefficients : littéraire (L…) ou scientifique et technique industrielle (S…, T…). */
export function seriesFamily(series: string): "L" | "S" | null {
  if (series.startsWith("L")) return "L";
  if (series.startsWith("S") || series.startsWith("T")) return "S";
  return null;
}

/** Coefficient pour une série : valeur propre à la série, sinon celle de sa famille, sinon la valeur commune. */
export function coefficientFor(rule: CoefficientRule, series?: string): number {
  if (!series) return rule.default;
  const family = seriesFamily(series);
  return rule.bySeries?.[series] ?? (family ? rule.bySeries?.[family] : undefined) ?? rule.default;
}

/** Matière enseignée à ce niveau (niveaux concernés, et coefficient non nul pour la série). */
export function appliesToLevel(subject: SubjectPreset, level: LevelPreset): boolean {
  if (subject.onlyLevels && !subject.onlyLevels.includes(level.code)) return false;
  return coefficientFor(subject.coefficient, level.series) > 0;
}

/** Lettres des classes parallèles : A, B, C… */
export function classLetters(count: number): string[] {
  if (!Number.isInteger(count) || count < 0 || count > 26) throw new RangeError("Entre 0 et 26 classes par niveau.");
  return Array.from({ length: count }, (_, index) => String.fromCharCode(65 + index));
}

/**
 * Noms des classes d'un niveau : « CM2 A », « CM2 B » ; au lycée « 2nde S1 », « 2nde S2 » (ou « 2nde S » s'il n'y en a
 * qu'une), et pour une série numérotée « 1ère S1 A », « 1ère S1 B » (ou « 1ère S1 »).
 */
export function classNames(level: LevelPreset, count: number): string[] {
  if (level.series) {
    if (count === 1) return [`${level.code} ${level.series}`];
    if (level.series.length > 1) return classLetters(count).map((letter) => `${level.code} ${level.series} ${letter}`);
    return Array.from({ length: count }, (_, index) => `${level.code} ${level.series}${index + 1}`);
  }
  return classLetters(count).map((letter) => `${level.code} ${letter}`);
}
