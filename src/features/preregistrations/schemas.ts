import { z } from "zod";
import { Constants } from "@/lib/supabase/database.types";
import { optionalEmailField, optionalIsoDateField, optionalText, phoneField, requiredText } from "@/lib/validation";
import { RELATIONSHIPS } from "@/features/students/schemas";

export const PREREGISTRATION_STATUSES = Constants.public.Enums.preregistration_status;
export type PreregistrationStatus = (typeof PREREGISTRATION_STATUSES)[number];

/** Pièces jointes : 3 au plus, photo (réduite en JPEG dans le navigateur) ou PDF. */
export const ATTACHMENT_LIMIT = 3;
export const ATTACHMENT_MAX_BYTES = 3 * 1024 * 1024;
export const ATTACHMENT_KINDS = ["jpg", "pdf"] as const;

const SLUG = /^[a-z0-9-]{1,80}$/;
export const slugField = z.string().regex(SLUG);

export const prepareUploadsSchema = z.object({
  slug: slugField,
  kinds: z.array(z.enum(ATTACHMENT_KINDS)).min(1).max(ATTACHMENT_LIMIT),
});

export const preregistrationSchema = z.object({
  slug: slugField,
  levelId: z.uuid({ error: "preregistrations.errors.levelRequired" }),
  childFirstName: requiredText(80),
  childLastName: requiredText(80),
  childSex: z.enum(["F", "M"], { error: "validation.required" }),
  childBirthDate: optionalIsoDateField,
  previousSchool: optionalText(160),
  guardianName: requiredText(120, 2),
  guardianPhone: phoneField,
  guardianRelationship: z.enum(RELATIONSHIPS),
  guardianEmail: optionalEmailField,
  message: optionalText(1000),
  attachments: z
    .array(z.object({ path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|pdf)$/), name: requiredText(120) }))
    .max(ATTACHMENT_LIMIT),
  /** Champ piège invisible : rempli seulement par les robots. */
  website: z.string().optional(),
});
export type PreregistrationInput = z.input<typeof preregistrationSchema>;

export const decisionSchema = z.object({
  id: z.uuid(),
  status: z.enum(["accepted", "rejected"]),
  note: optionalText(500),
});
export type DecisionInput = z.input<typeof decisionSchema>;

export const enrollSchema = z.object({
  id: z.uuid(),
  classId: z.uuid({ error: "students.errors.classRequired" }),
  matricule: optionalText(30),
});
export type EnrollInput = z.input<typeof enrollSchema>;
