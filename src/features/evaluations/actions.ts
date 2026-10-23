"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { getSchoolContext } from "@/lib/auth/school-context";
import { createClient } from "@/lib/supabase/server";
import {
  evaluationSchema,
  scheduleCompositionSchema,
  updateEvaluationSchema,
  type EvaluationInput,
  type ScheduleCompositionInput,
  type UpdateEvaluationInput,
} from "./schemas";

/** Codes des déclencheurs private.check_evaluation et private.check_evaluation_scores (migrations evaluations, grades). */
const EVALUATION_CODES = ["periodMismatch", "subjectNotInLevel", "dateOutsidePeriod", "periodLocked", "maxBelowScores"] as const;

/** Erreur rattachée à un champ du formulaire. */
const FIELD_CODES: Partial<Record<(typeof EVALUATION_CODES)[number], string>> = {
  dateOutsidePeriod: "heldOn",
  maxBelowScores: "maxScore",
};

function evaluationError(error: { code?: string; message?: string }) {
  if (error.code === "P0001" && (EVALUATION_CODES as readonly string[]).includes(error.message ?? "")) {
    const code = error.message as (typeof EVALUATION_CODES)[number];
    const key = `evaluations.errors.${code}`;
    const field = FIELD_CODES[code];
    return field ? fail("validation.form", { [field]: key }) : fail(key);
  }
  // Index evaluations_one_composition : une composition par classe, matière et période.
  if (error.code === "23505") return fail("evaluations.errors.compositionExists");
  if (error.code === "42501") return fail("errors.forbidden");
  return fail("errors.unknown");
}

/**
 * École active de l'utilisateur : espace professeur ou direction. Les droits fins (matière enseignée,
 * titulaire, direction) sont vérifiés par la RLS (private.can_grade).
 */
async function schoolId() {
  const ctx = (await getSchoolContext("professeur")) ?? (await getSchoolContext("direction"));
  return ctx?.schoolId ?? null;
}

export async function createEvaluation(input: EvaluationInput): Promise<ActionResult> {
  if (!(await getCurrentUser())) return fail("errors.forbidden");
  const parsed = evaluationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const school = await schoolId();
  if (!school) return fail("errors.forbidden");
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("evaluations").insert({
    school_id: school,
    class_id: v.classId,
    subject_id: v.subjectId,
    period_id: v.periodId,
    kind: v.kind,
    title: v.title,
    held_on: v.heldOn,
    max_score: v.maxScore,
    weight: v.weight,
  });
  if (error) return evaluationError(error);
  refresh();
  return ok(undefined);
}

export async function updateEvaluation(input: UpdateEvaluationInput): Promise<ActionResult> {
  if (!(await getCurrentUser())) return fail("errors.forbidden");
  const parsed = updateEvaluationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluations")
    .update({ period_id: v.periodId, kind: v.kind, title: v.title, held_on: v.heldOn, max_score: v.maxScore, weight: v.weight })
    .eq("id", v.id)
    .select("id");
  if (error) return evaluationError(error);
  if (!data?.length) return fail("errors.notFound");
  refresh();
  return ok(undefined);
}

export async function deleteEvaluation(input: { id: string }): Promise<ActionResult> {
  if (!(await getCurrentUser())) return fail("errors.forbidden");
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.from("evaluations").delete().eq("id", parsed.data.id).select("id");
  if (error) return evaluationError(error);
  if (!data?.length) return fail("errors.notFound");
  refresh();
  return ok(undefined);
}

/** La direction programme la même composition pour plusieurs classes (tout ou rien). */
export async function scheduleComposition(input: ScheduleCompositionInput): Promise<ActionResult<{ count: number }>> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.manageAcademics(ctx.roles)) return fail("errors.forbidden");
  const parsed = scheduleCompositionSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("evaluations").insert(
    [...new Set(v.classIds)].map((classId) => ({
      school_id: ctx.schoolId,
      class_id: classId,
      subject_id: v.subjectId,
      period_id: v.periodId,
      kind: "composition" as const,
      title: v.title,
      held_on: v.heldOn,
    })),
  );
  if (error) return evaluationError(error);
  refresh();
  return ok({ count: new Set(v.classIds).size });
}

/** Publier les notes d'une évaluation aux parents, ou retirer la publication. */
export async function publishEvaluation(input: { id: string; published: boolean }): Promise<ActionResult> {
  if (!(await getCurrentUser())) return fail("errors.forbidden");
  const parsed = z.object({ id: z.uuid(), published: z.boolean() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluations")
    .update({ published_at: parsed.data.published ? new Date().toISOString() : null })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return evaluationError(error);
  if (!data?.length) return fail("errors.notFound");
  refresh();
  return ok(undefined);
}
