"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { todayInDakar } from "@/features/dashboard/calendar";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/auth/permissions";
import { getSchoolContext } from "@/lib/auth/school-context";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { periodError } from "./period";
import {
  JUSTIFICATION_BUCKET,
  reviewJustificationSchema,
  submitJustificationSchema,
  type ReviewJustificationInput,
  type SubmitJustificationInput,
} from "./schemas";

/** Codes renvoyés par les fonctions SQL (voir la migration absence_justifications). */
const JUSTIFICATION_CODES = [
  "notFound",
  "invalidDates",
  "invalidComment",
  "invalidFile",
  "missingProof",
  "invalidDecision",
  "invalidNote",
  "alreadyReviewed",
] as const;

function justificationError(error: { code?: string; message?: string }) {
  if (error.code === "P0001" && error.message === "forbidden") return fail("errors.forbidden");
  if (error.code === "P0001" && (JUSTIFICATION_CODES as readonly string[]).includes(error.message ?? "")) {
    return fail(`justifications.errors.${error.message}`);
  }
  return fail("errors.unknown");
}

/**
 * Le parent justifie une absence. La photo a déjà été déposée par le navigateur dans le stockage
 * (RLS : dossier de son enfant) ; la base vérifie qu'elle existe. En cas de refus, elle est retirée.
 */
export async function submitAbsenceJustification(input: SubmitJustificationInput): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail("errors.forbidden");
  const parsed = submitJustificationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const removeFile = async () => {
    if (v.file) await supabase.storage.from(JUSTIFICATION_BUCKET).remove([v.file.path]);
  };
  const dates = periodError(v.from, v.to, todayInDakar());
  if (dates) {
    await removeFile();
    return fail("validation.form", { [dates === "justifications.errors.tooOld" ? "from" : "to"]: dates });
  }
  if (!v.file && !v.comment) {
    await removeFile();
    return fail("validation.form", { comment: "justifications.errors.missingProof" });
  }

  const { data, error } = await supabase.rpc("submit_absence_justification", {
    p_student_id: v.studentId,
    p_from: v.from,
    p_to: v.to,
    p_reason: v.reason,
    p_comment: v.comment ?? undefined,
    p_file_path: v.file?.path ?? undefined,
    p_mime_type: v.file?.mimeType ?? undefined,
  });
  if (error) {
    await removeFile();
    return justificationError(error);
  }
  refresh();
  return ok({ id: data });
}

/** Le parent retire un justificatif encore en attente (erreur de photo, d'enfant…). */
export async function withdrawAbsenceJustification(input: { id: string }): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("errors.forbidden");
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data: path, error } = await supabase.rpc("withdraw_absence_justification", { p_id: parsed.data.id });
  if (error) return justificationError(error);
  if (path) await supabase.storage.from(JUSTIFICATION_BUCKET).remove([path]);
  refresh();
  return ok(undefined);
}

/** La direction accepte ou refuse un justificatif (une décision peut être corrigée). */
export async function reviewAbsenceJustification(input: ReviewJustificationInput): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.reviewAbsences(ctx.roles)) return fail("errors.forbidden");
  const parsed = reviewJustificationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_absence_justification", {
    p_id: parsed.data.id,
    p_status: parsed.data.decision,
    p_note: parsed.data.note ?? undefined,
  });
  if (error) return justificationError(error);
  refresh();
  return ok(undefined);
}
