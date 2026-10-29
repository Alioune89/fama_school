"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { optionalText, requiredText } from "@/lib/validation";

const lessonSchema = z
  .object({
    classId: z.uuid(),
    subjectId: z.uuid(),
    taughtOn: z.iso.date({ error: "validation.required" }),
    content: requiredText(2000, 2),
    chapterId: z.uuid().nullable(),
    homework: optionalText(1000),
    homeworkDueOn: z.iso.date().nullable(),
  })
  .refine((v) => !v.homework || v.homeworkDueOn, { error: "lessonBook.errors.dueDateRequired", path: ["homeworkDueOn"] })
  .refine((v) => !v.homework || !v.homeworkDueOn || v.homeworkDueOn >= v.taughtOn, {
    error: "lessonBook.errors.dueBeforeLesson",
    path: ["homeworkDueOn"],
  });

/** Note une séance au cahier de textes, avec son éventuel devoir (publié aussitôt aux parents). */
export async function addLesson(input: z.input<typeof lessonSchema>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("errors.forbidden");
  const parsed = lessonSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const { data: klass } = await supabase.from("classes").select("school_id").eq("id", v.classId).maybeSingle();
  if (!klass) return fail("errors.forbidden");
  const { error } = await supabase.from("lesson_entries").insert({
    school_id: klass.school_id,
    class_id: v.classId,
    subject_id: v.subjectId,
    taught_on: v.taughtOn,
    content: v.content,
    chapter_id: v.chapterId,
    homework: v.homework,
    homework_due_on: v.homework ? v.homeworkDueOn : null,
    author_name: "",
    created_by: user.id,
  });
  if (error) return fail(error.code === "42501" ? "errors.forbidden" : "errors.unknown");
  refresh();
  return ok(undefined);
}

export async function deleteLesson(input: { id: string }): Promise<ActionResult> {
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase.from("lesson_entries").delete().eq("id", parsed.data.id).select("id");
  if (error) return fail("errors.unknown");
  if (!data?.length) return fail("errors.forbidden");
  refresh();
  return ok(undefined);
}
