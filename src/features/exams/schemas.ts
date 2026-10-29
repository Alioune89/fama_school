import { z } from "zod";
import { Constants } from "@/lib/supabase/database.types";

export const EXAMS = ["CFEE", "BFEM", "BAC"] as const;
export type Exam = (typeof EXAMS)[number];
export const EXAM_RESULTS = Constants.public.Enums.exam_result;
export const EXAM_MENTIONS = Constants.public.Enums.exam_mention;
export type ExamResult = (typeof EXAM_RESULTS)[number];
export type ExamMention = (typeof EXAM_MENTIONS)[number];

/** Résultats qui ouvrent une mention (admis au premier ou au second tour). */
export const ADMITTED: readonly ExamResult[] = ["admitted", "admitted_second_round"];

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: "validation.tooLong" })
    .transform((value) => value || null);

export const saveCandidatesSchema = z.object({
  exam: z.enum(EXAMS),
  rows: z
    .array(
      z
        .object({
          studentId: z.uuid(),
          tableNumber: optional(20),
          center: optional(120),
          result: z.enum(EXAM_RESULTS),
          mention: z.enum(EXAM_MENTIONS).nullable(),
        })
        .transform((row) => ({ ...row, mention: ADMITTED.includes(row.result) ? row.mention : null })),
    )
    .min(1)
    .max(500),
});
export type SaveCandidatesInput = z.input<typeof saveCandidatesSchema>;
