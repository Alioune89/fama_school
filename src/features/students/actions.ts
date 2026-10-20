"use server";

import { refresh } from "next/cache";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/auth/permissions";
import { getSchoolContext } from "@/lib/auth/school-context";
import { createClient } from "@/lib/supabase/server";
import {
  changeClassSchema,
  endEnrollmentSchema,
  importBatchSchema,
  registerStudentSchema,
  updateStudentSchema,
  type ChangeClassInput,
  type EndEnrollmentInput,
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
const isRegistrationCode = (value: unknown): value is RegistrationCode =>
  (REGISTRATION_CODES as readonly unknown[]).includes(value);

function registrationCode(error: { code?: string; message?: string }): RegistrationCode {
  if (error.code === "P0001" && isRegistrationCode(error.message)) return error.message;
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

async function currentYearId(schoolId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("academic_years")
    .select("id")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();
  return data?.id ?? null;
}

/** Classe de l'année en cours : changement de classe, ou réinscription d'un élève sans inscription cette année. */
export async function changeClass(input: ChangeClassInput): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.managePeople(ctx.roles)) return fail("errors.forbidden");
  const parsed = changeClassSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const yearId = await currentYearId(ctx.schoolId);
  if (!yearId) return fail("students.errors.noYear");

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("enrollments")
    .select("id")
    .eq("school_id", ctx.schoolId)
    .eq("student_id", parsed.data.studentId)
    .eq("academic_year_id", yearId)
    .maybeSingle();

  // La clé (classe, année) garantit que la classe choisie appartient bien à l'année en cours.
  const { error } = existing
    ? await supabase.from("enrollments").update({ class_id: parsed.data.classId }).eq("id", existing.id)
    : await supabase.from("enrollments").insert({
        school_id: ctx.schoolId,
        student_id: parsed.data.studentId,
        class_id: parsed.data.classId,
        academic_year_id: yearId,
      });
  if (error) {
    if (error.code === "23503") return fail("validation.form", { classId: "students.errors.unknownClass" });
    return fail(registrationCode(error) === "forbidden" ? "errors.forbidden" : "errors.unknown");
  }
  refresh();
  return ok(undefined);
}

/** Départ en cours d'année (transfert vers une autre école ou abandon) : l'élève quitte l'effectif de sa classe. */
export async function endEnrollment(input: EndEnrollmentInput): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.managePeople(ctx.roles)) return fail("errors.forbidden");
  const parsed = endEnrollmentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const yearId = await currentYearId(ctx.schoolId);
  if (!yearId) return fail("students.errors.noYear");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrollments")
    .update({ status: parsed.data.status, left_on: parsed.data.leftOn })
    .eq("school_id", ctx.schoolId)
    .eq("student_id", parsed.data.studentId)
    .eq("academic_year_id", yearId)
    .eq("status", "active")
    .select("id");
  if (error?.code === "23514") return fail("validation.form", { leftOn: "students.errors.leftBeforeEnrollment" });
  if (error) return fail("errors.unknown");
  if (!data?.length) return fail("errors.notFound");
  refresh();
  return ok(undefined);
}

/** Annule un départ enregistré par erreur : l'élève retrouve sa classe. */
export async function cancelDeparture(input: { studentId: string }): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.managePeople(ctx.roles)) return fail("errors.forbidden");
  const parsed = changeClassSchema.pick({ studentId: true }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const yearId = await currentYearId(ctx.schoolId);
  if (!yearId) return fail("students.errors.noYear");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrollments")
    .update({ status: "active", left_on: null })
    .eq("school_id", ctx.schoolId)
    .eq("student_id", parsed.data.studentId)
    .eq("academic_year_id", yearId)
    .in("status", ["transferred", "left"])
    .select("id");
  if (error) return fail("errors.unknown");
  if (!data?.length) return fail("errors.notFound");
  refresh();
  return ok(undefined);
}
