import { z } from "zod";
import { isoDateField, requiredText } from "@/lib/validation";

/** Types d'évaluation (enum public.evaluation_kind), dans l'ordre d'affichage. */
export const EVALUATION_KINDS = ["devoir", "interrogation", "composition"] as const;
export type EvaluationKind = (typeof EVALUATION_KINDS)[number];

const maxScoreField = z
  .union([z.literal(""), z.coerce.number({ error: "validation.invalid" })])
  .transform((value) => (value === "" ? null : value))
  .refine((value) => value === null || (value > 0 && value <= 100), { error: "evaluations.errors.maxScore" });

const weightField = z.coerce
  .number({ error: "validation.invalid" })
  .refine((value) => value > 0 && value <= 10, { error: "evaluations.errors.weight" });

export const evaluationSchema = z.object({
  classId: z.uuid(),
  subjectId: z.uuid(),
  periodId: z.uuid(),
  kind: z.enum(EVALUATION_KINDS, { error: "validation.required" }),
  title: requiredText(80, 2),
  heldOn: isoDateField,
  maxScore: maxScoreField,
  weight: weightField,
});
export type EvaluationInput = z.input<typeof evaluationSchema>;

export const updateEvaluationSchema = evaluationSchema.omit({ classId: true, subjectId: true }).extend({ id: z.uuid() });
export type UpdateEvaluationInput = z.input<typeof updateEvaluationSchema>;

/** Composition programmée par la direction pour plusieurs classes à la fois. */
export const scheduleCompositionSchema = z.object({
  subjectId: z.uuid({ error: "validation.required" }),
  periodId: z.uuid(),
  title: requiredText(80, 2),
  heldOn: isoDateField,
  classIds: z.array(z.uuid()).min(1, { error: "evaluations.errors.noClass" }).max(60),
});
export type ScheduleCompositionInput = z.input<typeof scheduleCompositionSchema>;
