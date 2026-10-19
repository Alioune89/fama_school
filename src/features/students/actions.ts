"use server";

import { refresh } from "next/cache";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/auth/permissions";
import { getSchoolContext } from "@/lib/auth/school-context";
import { createClient } from "@/lib/supabase/server";
import {
  importBatchSchema,
  registerStudentSchema,
  updateStudentSchema,
  type ImportRow,
  type RegisterStudentInput,
  type UpdateStudentInput,
} from "./schemas";

/** Codes renvoyés par les fonctions SQL d'inscription (voir la migration student_registration). */
const REGISTRATION_CODES = [
  "unknownClass",
  "duplicateMatricule",
  "invalidValue",
  "invalidGuardian",
  "noYear",
  "forbidden",
] as const;
export type RegistrationCode = (typeof REGISTRATION_CODES)[number] | "unknown";
const isRegistrationCode = (value: unknown): value is RegistrationCode => (REGISTRATION_CODES as readonly unknown[]).includes(value);

function registrationCode(error: { code?: string; message?: string }): RegistrationCode {
  if (error.code === "P0001" && isRegistrationCode(error.message))
    return error.message;
  if (error.code === "23505") return "duplicateMatricule";
  if (error.code === "42501") return "forbidden";
  if (error.code && ["23514", "22P02", "22007", "22008", "23502"].includes(error.code)) return "invalidValue";
  return "unknown";
}

/** Inscription d'un élève : fiche, inscription dans la classe et parents, en une transaction. */
export async function registerStudent(input: RegisterStudentInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.managePeople(ctx.roles)) return fail("errors.forbidden");
  const parsed = registerStudentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_student", {
    p_school_id: ctx.schoolId,
    p_class_id: v.classId,
    p_student: {
      matricule: v.matricule,
      first_name: v.firstName,
      last_name: v.lastName,
      sex: v.sex,
      birth_date: v.birthDate,
      birth_place: v.birthPlace,
      nationality: v.nationality,
      address: v.address,
      medical_notes: v.medicalNotes,
    },
    p_guardians: v.guardians.map((guardian) => ({
      full_name: guardian.fullName,
      phone: guardian.phone,
      relationship: guardian.relationship,
    })),
  });

  if (error) {
    const code = registrationCode(error);
    if (code === "forbidden") return fail("errors.forbidden");
    if (code === "duplicateMatricule") return fail("validation.form", { matricule: "students.errors.duplicateMatricule" });
    if (code === "unknownClass") return fail("validation.form", { classId: "students.errors.unknownClass" });
    return fail(code === "unknown" ? "errors.unknown" : `students.errors.${code}`);
  }
  refresh();
  return ok({ id: data });
}

/** Mise à jour de l'identité de l'élève (la classe et les parents se gèrent à part). */
export async function updateStudent(input: UpdateStudentInput): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.managePeople(ctx.roles)) return fail("errors.forbidden");
  const parsed = updateStudentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .update({
      first_name: v.firstName,
      last_name: v.lastName,
      sex: v.sex,
      birth_date: v.birthDate,
      birth_place: v.birthPlace,
      nationality: v.nationality,
      address: v.address,
      medical_notes: v.medicalNotes,
    })
    .eq("school_id", ctx.schoolId)
    .eq("id", v.id)
    .select("id");
  if (error) return fail(registrationCode(error) === "invalidValue" ? "students.errors.invalidValue" : "errors.unknown");
  if (!data?.length) return fail("errors.forbidden");
  refresh();
  return ok(undefined);
}

export type ImportResult = { imported: number; errors: { row: number; code: RegistrationCode }[] };

/** Import d'un lot de lignes (250 au plus) : chaque ligne est inscrite ou signalée, sans bloquer les autres. */
export async function importStudents(input: { rows: ImportRow[] }): Promise<ActionResult<ImportResult>> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.managePeople(ctx.roles)) return fail("errors.forbidden");
  const parsed = importBatchSchema.safeParse(input);
  if (!parsed.success) return fail("students.import.invalidBatch");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_students", {
    p_school_id: ctx.schoolId,
    p_rows: parsed.data.rows.map((row) => ({
      row: row.row,
      class_name: row.className,
      student: row.student,
      guardians: row.guardians,
    })),
  });
  if (error) {
    const code = registrationCode(error);
    if (code === "forbidden") return fail("errors.forbidden");
    return fail(code === "noYear" ? "students.errors.noYear" : "errors.unknown");
  }

  const result = data as { imported: number; errors: { row: number; code: string }[] };
  if (result.imported > 0) refresh();
  return ok({
    imported: result.imported,
    errors: result.errors.map((e) => ({
      row: e.row,
      code: isRegistrationCode(e.code) ? e.code : "unknown",
    })),
  });
}
