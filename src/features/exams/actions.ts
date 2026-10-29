"use server";

import { refresh } from "next/cache";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/auth/permissions";
import { getSchoolContext } from "@/lib/auth/school-context";
import { createClient } from "@/lib/supabase/server";
import { saveCandidatesSchema, type SaveCandidatesInput } from "./schemas";

/** Numéros de table, centres et résultats d'un examen ; renvoie le nombre de candidats modifiés. */
export async function saveExamCandidates(input: SaveCandidatesInput): Promise<ActionResult<{ saved: number }>> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.manageExams(ctx.roles)) return fail("errors.forbidden");
  const parsed = saveCandidatesSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { exam, rows } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_exam_candidates", {
    p_school_id: ctx.schoolId,
    p_exam: exam,
    p_rows: rows.map((row) => ({
      student_id: row.studentId,
      table_number: row.tableNumber,
      center: row.center,
      result: row.result,
      mention: row.mention,
    })),
  });
  if (error) {
    if (error.code === "42501") return fail("errors.forbidden");
    if (error.message === "notCandidate" || error.message === "noYear") return fail(`exams.errors.${error.message}`);
    return fail("errors.unknown");
  }
  refresh();
  return ok({ saved: data });
}
