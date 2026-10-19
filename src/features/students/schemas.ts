import { z } from "zod";
import { Constants } from "@/lib/supabase/database.types";
import { optionalIsoDateField, optionalPhoneField, optionalText, requiredText } from "@/lib/validation";

export const RELATIONSHIPS = Constants.public.Enums.guardian_relationship;
export type Relationship = (typeof RELATIONSHIPS)[number];

export const guardianInputSchema = z.object({
  fullName: requiredText(120, 2),
  phone: optionalPhoneField,
  relationship: z.enum(RELATIONSHIPS),
});
export type GuardianInput = z.input<typeof guardianInputSchema>;

const identityFields = {
  firstName: requiredText(80),
  lastName: requiredText(80),
  sex: z.enum(["F", "M"], { error: "validation.required" }),
  birthDate: optionalIsoDateField,
  birthPlace: optionalText(80),
  nationality: optionalText(40),
  address: optionalText(200),
  medicalNotes: optionalText(1000),
};

export const registerStudentSchema = z
  .object({
    ...identityFields,
    matricule: optionalText(30),
    classId: z.uuid({ error: "students.errors.classRequired" }),
    guardians: z.array(guardianInputSchema).min(1, { error: "students.errors.guardianRequired" }).max(4),
  })
  .superRefine((value, ctx) => {
    if (!value.guardians.some((guardian) => guardian.phone)) {
      ctx.addIssue({ code: "custom", path: ["guardians", 0, "phone"], message: "students.errors.guardianPhoneRequired" });
    }
  });
export type RegisterStudentInput = z.input<typeof registerStudentSchema>;

export const updateStudentSchema = z.object({ id: z.uuid(), ...identityFields });
export type UpdateStudentInput = z.input<typeof updateStudentSchema>;

/** Ligne d'import déjà normalisée par le lecteur (côté navigateur), revérifiée côté serveur. */
export const importRowSchema = z.object({
  row: z.number().int().min(1),
  className: requiredText(40),
  student: z.object({
    first_name: requiredText(80),
    last_name: requiredText(80),
    sex: z.enum(["F", "M"]),
    birth_date: z.iso.date().nullable(),
    birth_place: z.string().max(80).nullable(),
    nationality: z.string().max(40).nullable(),
    matricule: z.string().max(30).nullable(),
  }),
  guardians: z
    .array(
      z.object({
        full_name: requiredText(120, 2),
        phone: z
          .string()
          .regex(/^\+[1-9][0-9]{6,14}$/)
          .nullable(),
        relationship: z.enum(RELATIONSHIPS),
      }),
    )
    .max(2),
});
export type ImportRow = z.infer<typeof importRowSchema>;

export const importBatchSchema = z.object({ rows: z.array(importRowSchema).min(1).max(250) });
