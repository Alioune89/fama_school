import { z } from "zod";

/** Seuils des mentions automatiques (avertissement et blâme restent décidés en conseil de classe). */
const thresholdsSchema = z
  .object({
    felicitations: z.number().min(0),
    encouragements: z.number().min(0),
    tableauHonneur: z.number().min(0),
  })
  .refine((t) => t.felicitations >= t.encouragements && t.encouragements >= t.tableauHonneur, {
    error: "settings.errors.thresholdsOrder",
  });

export type MentionThresholds = z.infer<typeof thresholdsSchema>;

export const DEFAULT_SETTINGS = {
  mentionThresholds: {
    twenty: { felicitations: 16, encouragements: 14, tableauHonneur: 12 },
    ten: { felicitations: 8, encouragements: 7, tableauHonneur: 6 },
  },
  /** Poids de chaque type d'évaluation dans la moyenne d'une matière (Lot 3). */
  evaluationWeights: { devoir: 1, interrogation: 1, composition: 2 },
  francoArabic: false,
} as const;

export const schoolSettingsSchema = z.object({
  mentionThresholds: z
    .object({
      twenty: thresholdsSchema.refine((t) => t.felicitations <= 20, { error: "settings.errors.thresholdsMax" }),
      ten: thresholdsSchema.refine((t) => t.felicitations <= 10, { error: "settings.errors.thresholdsMax" }),
    })
    .default(DEFAULT_SETTINGS.mentionThresholds),
  evaluationWeights: z
    .object({
      devoir: z.number().min(0).max(10),
      interrogation: z.number().min(0).max(10),
      composition: z.number().min(0).max(10),
    })
    .refine((w) => w.devoir + w.interrogation + w.composition > 0, { error: "settings.errors.weightsZero" })
    .default(DEFAULT_SETTINGS.evaluationWeights),
  francoArabic: z.boolean().default(false),
  onboardingCompletedAt: z.iso.datetime().nullable().default(null),
});

export type SchoolSettings = z.infer<typeof schoolSettingsSchema>;

/**
 * Lit les réglages stockés (JSON libre en base) : toute valeur absente ou invalide
 * est remplacée par la valeur par défaut, sans jamais bloquer l'affichage.
 */
export function parseSchoolSettings(raw: unknown): SchoolSettings {
  const source = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(schoolSettingsSchema.shape) as (keyof typeof schoolSettingsSchema.shape)[]) {
    const parsed = schoolSettingsSchema.shape[key].safeParse(source[key]);
    result[key] = parsed.success ? parsed.data : schoolSettingsSchema.shape[key].parse(undefined);
  }
  return result as SchoolSettings;
}
