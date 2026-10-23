"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Codes de public.save_subject_appreciations et de son déclencheur (migration subject_appreciations). */
const APPRECIATION_CODES = ["periodLocked", "periodMismatch", "subjectNotInLevel", "unknownStudent"] as const;

const appreciationsSchema = z.object({
  classId: z.uuid(),
  subjectId: z.uuid(),
  periodId: z.uuid(),
  /** Texte par élève ; un texte vide efface l'appréciation. */
  items: z.record(z.uuid(), z.string().max(300, "validation.tooLong")),
});
export type AppreciationsInput = z.input<typeof appreciationsSchema>;

/** Appréciations d'une classe dans une matière (droits vérifiés par la base : private.can_grade). */
export async function saveAppreciations(input: AppreciationsInput): Promise<ActionResult> {
  if (!(await getCurrentUser())) return fail("errors.forbidden");
  const parsed = appreciationsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_subject_appreciations", {
    p_class_id: v.classId,
    p_subject_id: v.subjectId,
    p_period_id: v.periodId,
    p_items: v.items,
  });
  if (error) {
    if (error.code === "P0001" && (APPRECIATION_CODES as readonly string[]).includes(error.message)) {
      return fail(`grades.errors.${error.message}`);
    }
    if (error.code === "P0001" && error.message === "forbidden") return fail("errors.forbidden");
    return fail("errors.unknown");
  }
  refresh();
  return ok(undefined);
}
