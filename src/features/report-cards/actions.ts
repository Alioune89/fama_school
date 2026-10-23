"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/auth/permissions";
import { getSchoolContext } from "@/lib/auth/school-context";
import { createClient } from "@/lib/supabase/server";
import { buildClassReportCards } from "./build";
import { loadBuildInput } from "./queries";

/** Codes du déclencheur private.check_report_card (migration report_cards). */
const REPORT_CARD_CODES = ["periodNotLocked", "periodMismatch", "unknownStudent"] as const;

const classPeriodSchema = z.object({ classId: z.uuid(), periodId: z.uuid() });

async function academicsContext() {
  const ctx = await getSchoolContext("direction");
  return ctx && permissions.manageAcademics(ctx.roles) ? ctx : null;
}

/**
 * Calcule et enregistre les bulletins d'une classe (période verrouillée). Une nouvelle génération
 * remplace le contenu et garde le code de vérification et la publication.
 */
export async function generateReportCards(input: {
  classId: string;
  periodId: string;
}): Promise<ActionResult<{ count: number }>> {
  const ctx = await academicsContext();
  if (!ctx) return fail("errors.forbidden");
  const parsed = classPeriodSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { classId, periodId } = parsed.data;

  const buildInput = await loadBuildInput(ctx.schoolId, classId, periodId);
  if (!buildInput) return fail("errors.notFound");
  if (buildInput.students.length === 0) return ok({ count: 0 });
  const cards = buildClassReportCards(buildInput);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_report_cards", {
    p_class_id: classId,
    p_period_id: periodId,
    p_cards: Object.fromEntries(cards),
  });
  if (error) {
    if (error.code === "P0001" && (REPORT_CARD_CODES as readonly string[]).includes(error.message)) {
      return fail(`reportCardsAdmin.errors.${error.message}`);
    }
    if (error.code === "P0001" && error.message === "forbidden") return fail("errors.forbidden");
    return fail("errors.unknown");
  }
  refresh();
  return ok({ count: data ?? 0 });
}

/** Publier aux parents les bulletins générés d'une classe, ou retirer la publication. */
export async function publishReportCards(input: {
  classId: string;
  periodId: string;
  published: boolean;
}): Promise<ActionResult> {
  const ctx = await academicsContext();
  if (!ctx) return fail("errors.forbidden");
  const parsed = classPeriodSchema.extend({ published: z.boolean() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { classId, periodId, published } = parsed.data;

  const supabase = await createClient();
  let query = supabase
    .from("report_cards")
    .update({ published_at: published ? new Date().toISOString() : null })
    .eq("class_id", classId)
    .eq("period_id", periodId);
  // Une publication ne change pas la date des bulletins déjà publiés.
  query = published ? query.is("published_at", null) : query;
  const { error } = await query;
  if (error) return fail("errors.unknown");
  refresh();
  return ok(undefined);
}
