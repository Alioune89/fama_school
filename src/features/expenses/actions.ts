"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/auth/permissions";
import { getSchoolContext } from "@/lib/auth/school-context";
import { Constants } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { isoDateField, optionalText, requiredText } from "@/lib/validation";

const expenseSchema = z.object({
  spentOn: isoDateField,
  category: z.enum(Constants.public.Enums.expense_category, { error: "validation.required" }),
  label: requiredText(120, 2),
  amount: z
    .string()
    .transform((value) => value.replace(/[\s  .]/g, ""))
    .refine((value) => /^\d{1,9}$/.test(value) && Number(value) > 0 && Number(value) <= 100_000_000, {
      error: "expenses.errors.amount",
    })
    .transform(Number),
  method: z.enum(Constants.public.Enums.payment_method, { error: "validation.required" }),
  reference: optionalText(80),
});
export type ExpenseInput = z.input<typeof expenseSchema>;

async function financeContext() {
  const ctx = await getSchoolContext("direction");
  return ctx && permissions.manageFinance(ctx.roles) ? ctx : null;
}

export async function addExpense(input: ExpenseInput): Promise<ActionResult> {
  const ctx = await financeContext();
  if (!ctx) return fail("errors.forbidden");
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    school_id: ctx.schoolId,
    spent_on: v.spentOn,
    category: v.category,
    label: v.label,
    amount: v.amount,
    method: v.method,
    reference: v.reference,
  });
  if (error) return fail("errors.unknown");
  refresh();
  return ok(undefined);
}

export async function deleteExpense(input: { id: string }): Promise<ActionResult> {
  const ctx = await financeContext();
  if (!ctx) return fail("errors.forbidden");
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", parsed.data.id).eq("school_id", ctx.schoolId);
  if (error) return fail("errors.unknown");
  refresh();
  return ok(undefined);
}
