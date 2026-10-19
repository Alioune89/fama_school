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

/** Coefficient d'une matière : valeur commune, éventuellement différente selon la série (lycée). */
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

export const LYCEE_SERIES = ["L", "S"] as const;

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
    { name: "Français", shortName: "FR", group: "Lettres", track: "french", coefficient: { default: 3, bySeries: { L: 5 } } },
    { name: "Philosophie", shortName: "PHILO", group: "Lettres", track: "french", coefficient: { default: 2, bySeries: { L: 5 } }, onlyLevels: ["1ère", "Tle"] },
    { name: "Mathématiques", shortName: "MATHS", group: "Sciences", track: "french", coefficient: { default: 2, bySeries: { S: 5 } } },
    { name: "Sciences physiques", shortName: "PC", group: "Sciences", track: "french", coefficient: { default: 1, bySeries: { S: 5 } } },
    { name: "Sciences de la vie et de la Terre", shortName: "SVT", group: "Sciences", track: "french", coefficient: { default: 2, bySeries: { S: 4 } } },
    { name: "Histoire-Géographie", shortName: "HG", group: "Lettres", track: "french", coefficient: { default: 2, bySeries: { L: 4 } } },
    { name: "Anglais", shortName: "ANG", group: "Langues", track: "french", coefficient: { default: 2, bySeries: { L: 4 } } },
    { name: "Espagnol", shortName: "ESP", group: "Langues", track: "french", coefficient: { default: 2, bySeries: { L: 3 } }, optional: true },
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

/** Niveaux d'un cycle ; au lycée, un niveau par série choisie (2nde L, 2nde S…). */
export function expandLevels(code: CycleCode, series: readonly string[] = LYCEE_SERIES): LevelPreset[] {
  const { levels } = cyclePreset(code);
  if (code !== "secondaire") return levels;
  return levels.flatMap((level) => series.map((serie) => ({ ...level, series: serie })));
}

export function coefficientFor(rule: CoefficientRule, series?: string): number {
  return (series ? rule.bySeries?.[series] : undefined) ?? rule.default;
}

export function appliesToLevel(subject: SubjectPreset, level: LevelPreset): boolean {
  return !subject.onlyLevels || subject.onlyLevels.includes(level.code);
}

/** Lettres des classes parallèles : A, B, C… */
export function classLetters(count: number): string[] {
  if (!Number.isInteger(count) || count < 0 || count > 26) throw new RangeError("Entre 0 et 26 classes par niveau.");
  return Array.from({ length: count }, (_, index) => String.fromCharCode(65 + index));
}

/** Noms des classes d'un niveau : « CM2 A », « CM2 B » ; au lycée « 2nde S1 », « 2nde S2 » (ou « 2nde S » s'il n'y en a qu'une). */
export function classNames(level: LevelPreset, count: number): string[] {
  if (level.series) {
    if (count === 1) return [`${level.code} ${level.series}`];
    return Array.from({ length: count }, (_, index) => `${level.code} ${level.series}${index + 1}`);
  }
  return classLetters(count).map((letter) => `${level.code} ${letter}`);
}
