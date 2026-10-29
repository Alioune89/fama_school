"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { getSchoolContext } from "@/lib/auth/school-context";
import { createClient } from "@/lib/supabase/server";
import { optionalText } from "@/lib/validation";
import { DAILY_REPORT_BUCKET } from "./bucket";

const reportSchema = z
  .object({
    body: optionalText(2000),
    /** Note vocale déjà envoyée dans le stockage (<école>/<auteur>/…), ou null pour la retirer. */
    audioPath: z.string().max(300).nullable(),
    audioSeconds: z.number().int().min(1).max(180).nullable(),
  })
  .refine((v) => v.body || v.audioPath, { error: "dailyReports.errors.empty", path: ["body"] });

/** Enregistre (ou remplace) le rapport du jour du professeur connecté. */
export async function saveDailyReport(input: z.input<typeof reportSchema>): Promise<ActionResult> {
  const ctx = await getSchoolContext("professeur");
  if (!ctx) return fail("errors.forbidden");
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  if (v.audioPath && !v.audioPath.startsWith(`${ctx.schoolId}/${ctx.user.id}/`)) return fail("errors.forbidden");

  const supabase = await createClient();
  const { data: previous } = await supabase
    .from("daily_reports")
    .select("audio_path")
    .eq("school_id", ctx.schoolId)
    .eq("author_id", ctx.user.id)
    .eq("report_date", new Date().toISOString().slice(0, 10))
    .maybeSingle();
  const { error } = await supabase.from("daily_reports").upsert(
    {
      school_id: ctx.schoolId,
      author_id: ctx.user.id,
      author_name: "",
      report_date: new Date().toISOString().slice(0, 10),
      body: v.body,
      audio_path: v.audioPath,
      audio_seconds: v.audioPath ? v.audioSeconds : null,
    },
    { onConflict: "school_id,author_id,report_date" },
  );
  if (error) return fail(error.code === "42501" ? "errors.forbidden" : "errors.unknown");
  // L'ancienne note vocale remplacée ou retirée est effacée du stockage.
  if (previous?.audio_path && previous.audio_path !== v.audioPath) {
    await supabase.storage.from(DAILY_REPORT_BUCKET).remove([previous.audio_path]);
  }
  refresh();
  return ok(undefined);
}
