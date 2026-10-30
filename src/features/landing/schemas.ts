import { z } from "zod";
import { optionalEmailField, optionalText, phoneField, requiredText } from "@/lib/validation";

export const DEMO_ROLES = ["founder", "director", "censor", "accountant", "other"] as const;
export const STUDENT_RANGES = ["lt200", "200to500", "500to1000", "gt1000"] as const;

export const demoRequestSchema = z.object({
  fullName: requiredText(120, 2),
  schoolName: requiredText(160, 2),
  role: z.enum(DEMO_ROLES).nullable().catch(null),
  phone: phoneField,
  email: optionalEmailField,
  city: optionalText(80),
  studentsRange: z.enum(STUDENT_RANGES).nullable().catch(null),
  message: optionalText(1000),
  /** Champ piège invisible : rempli seulement par les robots. */
  website: z.string().optional(),
});
export type DemoRequestInput = z.input<typeof demoRequestSchema>;
