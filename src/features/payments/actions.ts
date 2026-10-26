"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/auth/permissions";
import { getSchoolContext } from "@/lib/auth/school-context";
import { Constants } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { optionalText, requiredText } from "@/lib/validation";

/** Codes des fonctions du guichet (migration payments). */
const PAYMENT_CODES = [
  "unknownStudent",
  "amountExceedsDue",
  "nothingDue",
  "paymentNotValid",
  "noCancellationRequest",
  "sameValidator",
  "reasonRequired",
] as const;

function paymentError(error: { code?: string; message?: string }) {
  if (error.code === "P0001" && (PAYMENT_CODES as readonly string[]).includes(error.message ?? "")) {
    return fail(`payments.errors.${error.message}`);
  }
  if (error.code === "P0001" && error.message === "forbidden") return fail("errors.forbidden");
  return fail("errors.unknown");
}

const paymentSchema = z.object({
  studentId: z.uuid(),
  amount: z
    .string()
    .transform((value) => value.replace(/[\s  .]/g, ""))
    .refine((value) => /^\d{1,9}$/.test(value) && Number(value) > 0, { error: "payments.errors.amount" })
    .transform(Number),
  method: z.enum(Constants.public.Enums.payment_method, { error: "validation.required" }),
  reference: optionalText(80),
  note: optionalText(200),
  invoiceIds: z.array(z.uuid()).min(1, { error: "payments.errors.noInvoice" }).max(100),
});
export type PaymentInput = z.input<typeof paymentSchema>;

export async function recordPayment(input: PaymentInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.manageFinance(ctx.roles)) return fail("errors.forbidden");
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  if (v.method === "online") return fail("errors.forbidden");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_payment", {
    p_student_id: v.studentId,
    p_amount: v.amount,
    p_method: v.method,
    p_reference: v.reference ?? undefined,
    p_note: v.note ?? undefined,
    p_invoice_ids: v.invoiceIds,
  });
  if (error) {
    if (error.message === "amountExceedsDue") return fail("validation.form", { amount: "payments.errors.amountExceedsDue" });
    return paymentError(error);
  }
  refresh();
  return ok({ id: data });
}

const cancellationSchema = z.object({ id: z.uuid(), reason: requiredText(200, 3) });

export async function requestCancellation(input: z.input<typeof cancellationSchema>): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.manageFinance(ctx.roles)) return fail("errors.forbidden");
  const parsed = cancellationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_payment_cancellation", {
    p_payment_id: parsed.data.id,
    p_reason: parsed.data.reason,
  });
  if (error) return paymentError(error);
  refresh();
  return ok(undefined);
}

export async function decideCancellation(input: { id: string; approve: boolean }): Promise<ActionResult> {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.manageSchool(ctx.roles)) return fail("errors.forbidden");
  const parsed = z.object({ id: z.uuid(), approve: z.boolean() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_payment_cancellation", {
    p_payment_id: parsed.data.id,
    p_approve: parsed.data.approve,
  });
  if (error) return paymentError(error);
  refresh();
  return ok(undefined);
}
