"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/auth/permissions";
import { getSchoolContext } from "@/lib/auth/school-context";
import { createClient } from "@/lib/supabase/server";
import { requiredText } from "@/lib/validation";

/** Codes de public.issue_invoices et public.cancel_invoice (migration invoices). */
const INVOICE_CODES = ["unknownYear", "monthOutsideSchedule", "invoiceAlreadyPaid", "invoiceCancelled"] as const;

function invoiceError(error: { code?: string; message?: string }) {
  if (error.code === "P0001" && (INVOICE_CODES as readonly string[]).includes(error.message ?? "")) {
    return fail(`invoices.errors.${error.message}`);
  }
  if (error.code === "P0001" && error.message === "forbidden") return fail("errors.forbidden");
  return fail("errors.unknown");
}

async function financeContext() {
  const ctx = await getSchoolContext("direction");
  return ctx && permissions.manageFinance(ctx.roles) ? ctx : null;
}

/** Émet les mensualités d'un mois (« 2026-10 ») ou, sans mois, les frais annuels de l'année. */
export async function issueInvoices(input: { yearId: string; month: string | null }): Promise<ActionResult<{ count: number }>> {
  if (!(await financeContext())) return fail("errors.forbidden");
  const parsed = z
    .object({
      yearId: z.uuid(),
      month: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .nullable(),
    })
    .safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("issue_invoices", {
    p_year_id: parsed.data.yearId,
    p_month: parsed.data.month ? `${parsed.data.month}-01` : undefined,
  });
  if (error) return invoiceError(error);
  refresh();
  return ok({ count: data ?? 0 });
}

const cancelSchema = z.object({ id: z.uuid(), reason: requiredText(200, 3) });

export async function cancelInvoice(input: z.input<typeof cancelSchema>): Promise<ActionResult> {
  if (!(await financeContext())) return fail("errors.forbidden");
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_invoice", { p_invoice_id: parsed.data.id, p_reason: parsed.data.reason });
  if (error) return invoiceError(error);
  refresh();
  return ok(undefined);
}
