import { z } from "zod";
import { DOCUMENT_MAX_BYTES, DOCUMENT_MIME_TYPES } from "@/features/students/schemas";
import { isoDateField, optionalText } from "@/lib/validation";

/** Motifs proposés au parent (enum public.justification_reason). */
export const JUSTIFICATION_REASONS = ["illness", "medical", "family", "other"] as const;
export type JustificationReason = (typeof JUSTIFICATION_REASONS)[number];

export const JUSTIFICATION_STATUSES = ["pending", "accepted", "refused"] as const;
export type JustificationStatus = (typeof JUSTIFICATION_STATUSES)[number];

/** Bornes de la base (submit_absence_justification) : 30 jours en arrière, 7 à l'avance, 15 jours de suite. */
export const JUSTIFICATION_PAST_DAYS = 30;
export const JUSTIFICATION_FUTURE_DAYS = 7;
export const JUSTIFICATION_MAX_SPAN_DAYS = 15;

export const JUSTIFICATION_BUCKET = "absence-justifications";
export const JUSTIFICATION_COMMENT_MAX = 500;
export const REVIEW_NOTE_MAX = 300;

export { DOCUMENT_MAX_BYTES as JUSTIFICATION_MAX_BYTES, DOCUMENT_MIME_TYPES as JUSTIFICATION_MIME_TYPES };

export const submitJustificationSchema = z.object({
  studentId: z.uuid(),
  from: isoDateField,
  to: isoDateField,
  reason: z.enum(JUSTIFICATION_REASONS, { error: "justifications.form.chooseReason" }),
  comment: optionalText(JUSTIFICATION_COMMENT_MAX),
  file: z
    .object({
      path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/),
      mimeType: z.enum(DOCUMENT_MIME_TYPES),
    })
    .nullable(),
});
export type SubmitJustificationInput = z.input<typeof submitJustificationSchema>;

export const reviewJustificationSchema = z.object({
  id: z.uuid(),
  decision: z.enum(["accepted", "refused"]),
  note: optionalText(REVIEW_NOTE_MAX),
});
export type ReviewJustificationInput = z.input<typeof reviewJustificationSchema>;
