"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const CODES = ["invalidStatus", "notDone"] as const;

function programmeError(error: { code?: string; message?: string }) {
  if (error.code === "P0001" && (CODES as readonly string[]).includes(error.message ?? "")) {
    return fail(`programme.errors.${error.message}`);
  }
  return fail(error.code === "42501" || error.message === "forbidden" ? "errors.forbidden" : "errors.unknown");
}

const month = z
  .string()
  .regex(/^\d{4}-\d{2}$/)
  .nullable();

const addSchema = z.object({
  levelId: z.uuid(),
  subjectId: z.uuid(),
  /** Un chapitre par ligne. */
  titles: z
    .string()
    .transform((value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .pipe(
      z
        .array(z.string().min(2, { error: "programme.errors.titleTooShort" }).max(160))
        .min(1, { error: "programme.errors.noChapter" })
        .max(60),
    ),
  sessions: z.number().int().min(1).max(60),
  targetMonth: month,
});

/** Ajoute des chapitres à la fin du programme (un par ligne). */
export async function addChapters(input: z.input<typeof addSchema>): Promise<ActionResult<{ count: number }>> {
  if (!(await getCurrentUser())) return fail("errors.forbidden");
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const [{ data: level }, { data: last }] = await Promise.all([
    supabase.from("levels").select("school_id").eq("id", v.levelId).maybeSingle(),
    supabase
      .from("programme_chapters")
      .select("position, year:academic_years!inner(is_current)")
      .eq("level_id", v.levelId)
      .eq("subject_id", v.subjectId)
      .eq("year.is_current", true)
      .order("position", { ascending: false })
      .limit(1),
  ]);
  if (!level) return fail("errors.forbidden");
  const { data: year } = await supabase
    .from("academic_years")
    .select("id")
    .eq("school_id", level.school_id)
    .eq("is_current", true)
    .maybeSingle();
  if (!year) return fail("programme.errors.noYear");
  const start = (last?.[0]?.position ?? 0) + 1;
  const { error } = await supabase.from("programme_chapters").insert(
    v.titles.map((title, index) => ({
      school_id: level.school_id,
      academic_year_id: year.id,
      level_id: v.levelId,
      subject_id: v.subjectId,
      position: start + index,
      title,
      sessions: v.sessions,
      target_month: v.targetMonth ? `${v.targetMonth}-01` : null,
    })),
  );
  if (error) return programmeError(error);
  refresh();
  return ok({ count: v.titles.length });
}

const updateSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(2, { error: "programme.errors.titleTooShort" }).max(160),
  sessions: z.number().int().min(1).max(60),
  targetMonth: month,
});

export async function updateChapter(input: z.input<typeof updateSchema>): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programme_chapters")
    .update({ title: v.title, sessions: v.sessions, target_month: v.targetMonth ? `${v.targetMonth}-01` : null })
    .eq("id", v.id)
    .select("id");
  if (error) return programmeError(error);
  if (!data?.length) return fail("errors.forbidden");
  refresh();
  return ok(undefined);
}

export async function deleteChapter(input: { id: string }): Promise<ActionResult> {
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase.from("programme_chapters").delete().eq("id", parsed.data.id).select("id");
  if (error) return programmeError(error);
  if (!data?.length) return fail("errors.forbidden");
  refresh();
  return ok(undefined);
}

const progressSchema = z.object({
  classId: z.uuid(),
  chapterId: z.uuid(),
  status: z.enum(["in_progress", "done"]).nullable(),
});

/** Le professeur fait avancer sa classe : en cours, terminé, ou retour à faire (null). */
export async function setChapterProgress(input: z.input<typeof progressSchema>): Promise<ActionResult> {
  const parsed = progressSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_chapter_progress", {
    p_class_id: parsed.data.classId,
    p_chapter_id: parsed.data.chapterId,
    p_status: parsed.data.status as string,
  });
  if (error) return programmeError(error);
  refresh();
  return ok(undefined);
}

/** La direction pédagogique valide un chapitre terminé, ou le renvoie « en cours ». */
export async function validateChapter(input: { classId: string; chapterId: string; approve: boolean }): Promise<ActionResult> {
  const parsed = z.object({ classId: z.uuid(), chapterId: z.uuid(), approve: z.boolean() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("validate_chapter", {
    p_class_id: parsed.data.classId,
    p_chapter_id: parsed.data.chapterId,
    p_approve: parsed.data.approve,
  });
  if (error) return programmeError(error);
  refresh();
  return ok(undefined);
}
