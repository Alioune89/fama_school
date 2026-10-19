import { z } from "zod";
import { parseYearLabel } from "@/lib/domain/academic-calendar";
import { schoolSettingsSchema } from "@/lib/domain/school-settings";
import { Constants } from "@/lib/supabase/database.types";
import { isoDateField, optionalEmailField, optionalPhoneField, optionalText, requiredText } from "@/lib/validation";

export const schoolIdentitySchema = z.object({
  name: requiredText(160, 2),
  shortName: optionalText(40),
  city: requiredText(80),
  region: optionalText(80),
  address: optionalText(200),
  phone: optionalPhoneField.refine((value) => value !== null, { error: "validation.required" }),
  email: optionalEmailField,
});
export type SchoolIdentityInput = z.input<typeof schoolIdentitySchema>;

const periodSchema = z.object({
  position: z.number().int().min(1).max(3),
  label: requiredText(40, 2),
  startsOn: isoDateField,
  endsOn: isoDateField,
});

export const academicYearSchema = z
  .object({
    label: z.string().trim().refine((value) => parseYearLabel(value) !== null, { error: "setup.errors.yearLabel" }),
    startsOn: isoDateField,
    endsOn: isoDateField,
    periodKind: z.enum(Constants.public.Enums.period_kind),
    periods: z.array(periodSchema).min(2).max(3),
  })
  .superRefine((value, ctx) => {
    if (value.endsOn <= value.startsOn) ctx.addIssue({ code: "custom", path: ["endsOn"], message: "setup.errors.yearDates" });
    const expected = value.periodKind === "semester" ? 2 : 3;
    if (value.periods.length !== expected) ctx.addIssue({ code: "custom", path: ["periods"], message: "setup.errors.periodCount" });
    const sorted = [...value.periods].sort((a, b) => a.position - b.position);
    sorted.forEach((period, index) => {
      if (period.endsOn <= period.startsOn) {
        ctx.addIssue({ code: "custom", path: ["periods", index, "endsOn"], message: "setup.errors.periodDates" });
      }
      if (period.startsOn < value.startsOn || period.endsOn > value.endsOn) {
        ctx.addIssue({ code: "custom", path: ["periods", index, "startsOn"], message: "setup.errors.periodOutside" });
      }
      const previous = sorted[index - 1];
      if (previous && period.startsOn <= previous.endsOn) {
        ctx.addIssue({ code: "custom", path: ["periods", index, "startsOn"], message: "setup.errors.periodOverlap" });
      }
    });
  });
export type AcademicYearInput = z.input<typeof academicYearSchema>;

export const levelsSchema = z
  .object({
    cycles: z.array(z.enum(Constants.public.Enums.cycle_code)).min(1, { error: "setup.errors.noCycle" }),
    series: z.array(z.enum(["L", "S"])),
    francoArabic: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.cycles.includes("secondaire") && value.series.length === 0) {
      ctx.addIssue({ code: "custom", path: ["series"], message: "setup.errors.noSeries" });
    }
  });
export type LevelsInput = z.input<typeof levelsSchema>;

export const subjectRowSchema = z.object({
  id: z.uuid().nullable(),
  name: requiredText(80, 2),
  nameAr: optionalText(80),
  shortName: optionalText(16),
  group: optionalText(80),
  track: z.enum(Constants.public.Enums.subject_track),
  /** Coefficient par niveau ; null = matière non enseignée à ce niveau. */
  coefficients: z.record(z.uuid(), z.number().positive({ error: "setup.errors.coefficient" }).max(20, { error: "setup.errors.coefficient" }).nullable()),
});

export const subjectsSchema = z
  .object({
    rows: z.array(subjectRowSchema).max(80),
    removedIds: z.array(z.uuid()),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    value.rows.forEach((row, index) => {
      const key = row.name.trim().toLocaleLowerCase("fr");
      if (seen.has(key)) ctx.addIssue({ code: "custom", path: ["rows", index, "name"], message: "validation.duplicate" });
      seen.add(key);
    });
  });
export type SubjectsInput = z.input<typeof subjectsSchema>;

export const classesSchema = z.object({
  levels: z.array(z.object({ levelId: z.uuid(), count: z.number().int().min(0).max(12) })).min(1),
  capacity: z.number().int().min(1).max(200).nullable(),
});
export type ClassesInput = z.input<typeof classesSchema>;

export const evaluationSchema = z.object({
  mentionThresholds: schoolSettingsSchema.shape.mentionThresholds.unwrap(),
  evaluationWeights: schoolSettingsSchema.shape.evaluationWeights.unwrap(),
});
export type EvaluationInput = z.input<typeof evaluationSchema>;
