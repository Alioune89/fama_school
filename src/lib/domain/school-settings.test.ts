import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSchoolSettings, schoolSettingsSchema } from "./school-settings";

describe("parseSchoolSettings", () => {
  it("remplit les valeurs par défaut pour une école sans réglages", () => {
    expect(parseSchoolSettings({})).toEqual({
      mentionThresholds: DEFAULT_SETTINGS.mentionThresholds,
      evaluationWeights: DEFAULT_SETTINGS.evaluationWeights,
      francoArabic: false,
      onboardingCompletedAt: null,
    });
  });

  it("garde les réglages valides et remplace seulement les invalides", () => {
    const settings = parseSchoolSettings({
      francoArabic: true,
      evaluationWeights: { devoir: 1, interrogation: 1, composition: 3 },
      mentionThresholds: { twenty: { felicitations: 10, encouragements: 14, tableauHonneur: 12 } },
    });
    expect(settings.francoArabic).toBe(true);
    expect(settings.evaluationWeights.composition).toBe(3);
    expect(settings.mentionThresholds).toEqual(DEFAULT_SETTINGS.mentionThresholds);
  });

  it("tolère une valeur stockée qui n'est pas un objet", () => {
    expect(parseSchoolSettings(null).francoArabic).toBe(false);
    expect(parseSchoolSettings("cassé").evaluationWeights).toEqual(DEFAULT_SETTINGS.evaluationWeights);
  });
});

describe("schoolSettingsSchema", () => {
  it("exige des seuils décroissants (félicitations ≥ encouragements ≥ tableau d'honneur)", () => {
    const result = schoolSettingsSchema.shape.mentionThresholds.safeParse({
      twenty: { felicitations: 14, encouragements: 16, tableauHonneur: 12 },
      ten: DEFAULT_SETTINGS.mentionThresholds.ten,
    });
    expect(result.success).toBe(false);
  });

  it("refuse des seuils au-delà du barème", () => {
    const result = schoolSettingsSchema.shape.mentionThresholds.safeParse({
      twenty: DEFAULT_SETTINGS.mentionThresholds.twenty,
      ten: { felicitations: 16, encouragements: 14, tableauHonneur: 12 },
    });
    expect(result.success).toBe(false);
  });

  it("refuse des pondérations toutes nulles", () => {
    expect(schoolSettingsSchema.shape.evaluationWeights.safeParse({ devoir: 0, interrogation: 0, composition: 0 }).success).toBe(false);
  });
});
