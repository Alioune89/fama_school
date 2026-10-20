"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/auth/permissions";
import { getSchoolContext } from "@/lib/auth/school-context";
import { createClient } from "@/lib/supabase/server";
import { recordDocumentSchema, studentPhotoSchema, type RecordDocumentInput } from "./schemas";

const BUCKET = "student-documents";

/**
 * Les fichiers sont envoyés par le navigateur directement dans le stockage (RLS : <école>/<élève>/…),
 * puis enregistrés ici. Le chemin doit appartenir à l'école active et à l'élève visé.
 */
const ownsPath = (path: string, schoolId: string, studentId: string) => path.startsWith(`${schoolId}/${studentId}/`);

async function studentExists(schoolId: string, studentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id, photo_path")
    .eq("school_id", schoolId)
    .eq("id", studentId)
    .maybeSingle();
  return data;
}

/** Ajoute un document au dossier de l'élève (extrait de naissance, bulletin précédent…). */
export async function recordStudentDocument(input: RecordDocumentInput): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.managePeople(ctx.roles)) return fail("errors.forbidden");
  const parsed = recordDocumentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  if (!ownsPath(v.path, ctx.schoolId, v.studentId) || !(await studentExists(ctx.schoolId, v.studentId))) {
    return fail("errors.forbidden");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("student_documents").insert({
    school_id: ctx.schoolId,
    student_id: v.studentId,
    kind: v.kind,
    file_path: v.path,
    file_name: v.fileName,
    mime_type: v.mimeType,
    size_bytes: v.sizeBytes,
    uploaded_by: ctx.user.id,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([v.path]);
    return fail("errors.unknown");
  }
  refresh();
  return ok(undefined);
}

export async function deleteStudentDocument(input: { documentId: string }): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.managePeople(ctx.roles)) return fail("errors.forbidden");
  const parsed = z.object({ documentId: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_documents")
    .delete()
    .eq("school_id", ctx.schoolId)
    .eq("id", parsed.data.documentId)
    .select("file_path");
  if (error) return fail("errors.unknown");
  if (!data?.length) return fail("errors.notFound");
  await supabase.storage.from(BUCKET).remove(data.map((row) => row.file_path));
  refresh();
  return ok(undefined);
}

/** Photo d'identité (null pour la retirer) ; l'ancienne photo est supprimée du stockage. */
export async function setStudentPhoto(input: { studentId: string; path: string | null }): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.managePeople(ctx.roles)) return fail("errors.forbidden");
  const parsed = studentPhotoSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { studentId, path } = parsed.data;
  if (path && !ownsPath(path, ctx.schoolId, studentId)) return fail("errors.forbidden");
  const student = await studentExists(ctx.schoolId, studentId);
  if (!student) return fail("errors.notFound");

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({ photo_path: path })
    .eq("school_id", ctx.schoolId)
    .eq("id", studentId);
  if (error) return fail("errors.unknown");
  if (student.photo_path && student.photo_path !== path) await supabase.storage.from(BUCKET).remove([student.photo_path]);
  refresh();
  return ok(undefined);
}
