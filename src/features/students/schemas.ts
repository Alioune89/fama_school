import { z } from "zod";
import { Constants } from "@/lib/supabase/database.types";
import { isoDateField, optionalIsoDateField, optionalPhoneField, optionalText, requiredText } from "@/lib/validation";

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

export const changeClassSchema = z.object({
  studentId: z.uuid(),
  classId: z.uuid({ error: "students.errors.classRequired" }),
});
export type ChangeClassInput = z.input<typeof changeClassSchema>;

export const DEPARTURE_STATUSES = ["transferred", "left"] as const;

export const endEnrollmentSchema = z.object({
  studentId: z.uuid(),
  status: z.enum(DEPARTURE_STATUSES, { error: "validation.required" }),
  leftOn: isoDateField,
});
export type EndEnrollmentInput = z.input<typeof endEnrollmentSchema>;

export const addGuardianSchema = guardianInputSchema.extend({ studentId: z.uuid(), isPrimary: z.boolean().default(false) });
export type AddGuardianInput = z.input<typeof addGuardianSchema>;

export const updateGuardianSchema = guardianInputSchema.extend({
  studentId: z.uuid(),
  guardianId: z.uuid(),
  profession: optionalText(80),
});
export type UpdateGuardianInput = z.input<typeof updateGuardianSchema>;

export const guardianLinkSchema = z.object({ studentId: z.uuid(), guardianId: z.uuid() });

/** Documents du dossier (la photo d'identité est gérée à part, sur la fiche). */
export const DOCUMENT_KINDS = ["birth_certificate", "previous_report", "medical", "other"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

/** Formats acceptés par le stockage (bucket student-documents), 5 Mo au plus. */
export const DOCUMENT_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"] as const;
export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

const storedFile = {
  studentId: z.uuid(),
  path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/),
};

export const recordDocumentSchema = z.object({
  ...storedFile,
  kind: z.enum(DOCUMENT_KINDS),
  fileName: requiredText(200),
  mimeType: z.enum(DOCUMENT_MIME_TYPES),
  sizeBytes: z.number().int().min(1).max(DOCUMENT_MAX_BYTES),
});
export type RecordDocumentInput = z.input<typeof recordDocumentSchema>;

export const studentPhotoSchema = z.object({ ...storedFile, path: storedFile.path.nullable() });
