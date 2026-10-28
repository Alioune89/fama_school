"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { requiredText } from "@/lib/validation";

/** Codes des fonctions de la messagerie (migration messaging). */
const CODES = ["invalidMessage", "notTeacherOfStudent", "notGuardianOfStudent"] as const;

function messagingError(error: { code?: string; message?: string }) {
  if (error.code === "P0001" && (CODES as readonly string[]).includes(error.message ?? "")) {
    return fail(`messages.errors.${error.message}`);
  }
  return fail(error.message === "forbidden" ? "errors.forbidden" : "errors.unknown");
}

const startSchema = z.object({
  studentId: z.uuid({ error: "messages.errors.chooseStudent" }),
  /** Parent : soi-même côté parent, le parent choisi côté personnel. */
  parentId: z.uuid({ error: "messages.errors.chooseParent" }).optional(),
  /** Professeur ; absent : la direction. */
  teacherId: z.uuid().nullable(),
  subject: requiredText(120, 3),
  body: requiredText(2000),
});

/** Ouvre une conversation avec son premier message. Renvoie son identifiant. */
export async function startConversation(input: z.input<typeof startSchema>): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail("errors.forbidden");
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_conversation", {
    p_student_id: v.studentId,
    p_parent_id: v.parentId ?? user.id,
    p_teacher_id: v.teacherId as string,
    p_subject: v.subject,
    p_body: v.body,
  });
  if (error) return messagingError(error);
  refresh();
  return ok({ id: data });
}

const sendSchema = z.object({ conversationId: z.uuid(), body: requiredText(2000) });

export async function sendMessage(input: z.input<typeof sendSchema>): Promise<ActionResult> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_message", {
    p_conversation_id: parsed.data.conversationId,
    p_body: parsed.data.body,
  });
  if (error) return messagingError(error);
  refresh();
  return ok(undefined);
}

/** Marque une conversation lue (et sa notification), sans rafraîchir la page. */
export async function markConversationRead(conversationId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(conversationId).success) return fail("errors.forbidden");
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
  return error ? messagingError(error) : ok(undefined);
}

/** Parents joignables d'un élève (pour le personnel qui ouvre une conversation). */
export async function loadParentContacts(studentId: string): Promise<ActionResult<{ userId: string; name: string }[]>> {
  if (!z.uuid().safeParse(studentId).success) return fail("errors.forbidden");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("student_parent_contacts", { p_student_id: studentId });
  if (error) return fail("errors.unknown");
  return ok((data ?? []) as { userId: string; name: string }[]);
}

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "messages.errors.time" });
const availabilitySchema = z
  .object({
    days: z.array(z.number().int().min(1).max(7)).min(1, { error: "messages.errors.noDay" }),
    startsAt: time,
    endsAt: time,
  })
  .refine((value) => value.endsAt > value.startsAt, { error: "messages.errors.endBeforeStart", path: ["endsAt"] });

/** Horaires de réponse du professeur connecté. */
export async function saveAvailability(input: z.input<typeof availabilitySchema>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("errors.forbidden");
  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("staff_availability").upsert({
    user_id: user.id,
    days: parsed.data.days,
    starts_at: parsed.data.startsAt,
    ends_at: parsed.data.endsAt,
  });
  if (error) return fail("errors.unknown");
  refresh();
  return ok(undefined);
}
