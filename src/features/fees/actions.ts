"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/auth/permissions";
import { getSchoolContext } from "@/lib/auth/school-context";
import { createClient } from "@/lib/supabase/server";
import {
  discountSchema,
  feeGridSchema,
  feeTypeSchema,
  type DiscountInput,
  type FeeGridInput,
  type FeeTypeInput,
} from "./schemas";

async function financeContext() {
  const ctx = await getSchoolContext("direction");
  return ctx && permissions.manageFinance(ctx.roles) ? ctx : null;
}

/** Frais courants au Sénégal, proposés à la mise en route (montants à saisir ensuite dans la grille). */
const DEFAULT_FEE_TYPES = [
  { name: "Inscription", kind: "registration", frequency: "once", optional: false },
  { name: "Mensualité", kind: "tuition", frequency: "monthly", optional: false },
  { name: "Cantine", kind: "canteen", frequency: "monthly", optional: true },
  { name: "Transport", kind: "transport", frequency: "monthly", optional: true },
  { name: "Tenue scolaire", kind: "uniform", frequency: "once", optional: true },
  { name: "Cotisation APE", kind: "parents_association", frequency: "once", optional: false },
] as const;

export async function addDefaultFeeTypes(): Promise<ActionResult> {
  const ctx = await financeContext();
  if (!ctx) return fail("errors.forbidden");
  const supabase = await createClient();
  const { error } = await supabase.from("fee_types").upsert(
    DEFAULT_FEE_TYPES.map((fee, index) => ({ ...fee, school_id: ctx.schoolId, position: index })),
    { onConflict: "school_id,name", ignoreDuplicates: true },
  );
  if (error) return fail("errors.unknown");
  refresh();
  return ok(undefined);
}

export async function saveFeeType(input: FeeTypeInput): Promise<ActionResult> {
  const ctx = await financeContext();
  if (!ctx) return fail("errors.forbidden");
  const parsed = feeTypeSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...fee } = parsed.data;

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("fee_types")
    .select("position")
    .eq("school_id", ctx.schoolId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = id
    ? await supabase.from("fee_types").update(fee).eq("id", id).eq("school_id", ctx.schoolId)
    : await supabase.from("fee_types").insert({ ...fee, school_id: ctx.schoolId, position: (last?.position ?? -1) + 1 });
  if (error?.code === "23505") return fail("validation.form", { name: "fees.errors.nameTaken" });
  if (error) return fail("errors.unknown");
  refresh();
  return ok(undefined);
}

/** Supprime un type de frais ; déjà facturé, il est archivé (retiré de la grille et des factures à venir). */
export async function deleteFeeType(input: { id: string }): Promise<ActionResult<{ archived: boolean }>> {
  const ctx = await financeContext();
  if (!ctx) return fail("errors.forbidden");
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("fee_types").delete().eq("id", parsed.data.id).eq("school_id", ctx.schoolId);
  if (error?.code === "23503") {
    const { error: archiveError } = await supabase
      .from("fee_types")
      .update({ active: false })
      .eq("id", parsed.data.id)
      .eq("school_id", ctx.schoolId);
    if (archiveError) return fail("errors.unknown");
    refresh();
    return ok({ archived: true });
  }
  if (error) return fail("errors.unknown");
  refresh();
  return ok({ archived: false });
}

/** Grille de l'année : calendrier des mensualités et montants par niveau (un montant vide ou nul retire le frais). */
export async function saveFeeGrid(input: FeeGridInput): Promise<ActionResult> {
  const ctx = await financeContext();
  if (!ctx) return fail("errors.forbidden");
  const parsed = feeGridSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { error: scheduleError } = await supabase.from("billing_schedules").upsert({
    academic_year_id: v.yearId,
    school_id: ctx.schoolId,
    installments: v.installments,
    first_month: v.firstMonth,
  });
  if (scheduleError) return fail("errors.unknown");

  const kept = v.rates.filter((rate) => rate.amount > 0);
  const removed = v.rates.filter((rate) => rate.amount === 0);
  if (kept.length > 0) {
    const { error } = await supabase.from("fee_rates").upsert(
      kept.map((rate) => ({
        school_id: ctx.schoolId,
        academic_year_id: v.yearId,
        level_id: rate.levelId,
        fee_type_id: rate.feeTypeId,
        amount: rate.amount,
        updated_at: new Date().toISOString(),
      })),
    );
    if (error) return fail("errors.unknown");
  }
  for (const rate of removed) {
    const { error } = await supabase
      .from("fee_rates")
      .delete()
      .eq("academic_year_id", v.yearId)
      .eq("level_id", rate.levelId)
      .eq("fee_type_id", rate.feeTypeId);
    if (error) return fail("errors.unknown");
  }
  refresh();
  return ok(undefined);
}

/** Inscrire un élève à un frais optionnel (cantine, transport), ou l'en retirer. */
export async function setFeeOption(input: {
  studentId: string;
  yearId: string;
  feeTypeId: string;
  enabled: boolean;
}): Promise<ActionResult> {
  const ctx = await financeContext();
  if (!ctx) return fail("errors.forbidden");
  const parsed = z.object({ studentId: z.uuid(), yearId: z.uuid(), feeTypeId: z.uuid(), enabled: z.boolean() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = v.enabled
    ? await supabase
        .from("student_fee_options")
        .upsert(
          { school_id: ctx.schoolId, academic_year_id: v.yearId, student_id: v.studentId, fee_type_id: v.feeTypeId },
          { ignoreDuplicates: true },
        )
    : await supabase
        .from("student_fee_options")
        .delete()
        .eq("academic_year_id", v.yearId)
        .eq("student_id", v.studentId)
        .eq("fee_type_id", v.feeTypeId);
  if (error?.code === "P0001") return fail("fees.errors.feeNotOptional");
  if (error) return fail("errors.unknown");
  refresh();
  return ok(undefined);
}

export async function addDiscount(input: DiscountInput): Promise<ActionResult> {
  const ctx = await financeContext();
  if (!ctx) return fail("errors.forbidden");
  const parsed = discountSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("student_discounts").insert({
    school_id: ctx.schoolId,
    academic_year_id: v.yearId,
    student_id: v.studentId,
    kind: v.kind,
    percent: v.percent,
    fee_type_id: v.feeTypeId,
  });
  if (error?.code === "23505") return fail("validation.form", { feeTypeId: "fees.errors.discountExists" });
  if (error) return fail("errors.unknown");
  refresh();
  return ok(undefined);
}

export async function removeDiscount(input: { id: string }): Promise<ActionResult> {
  const ctx = await financeContext();
  if (!ctx) return fail("errors.forbidden");
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("student_discounts").delete().eq("id", parsed.data.id).eq("school_id", ctx.schoolId);
  if (error) return fail("errors.unknown");
  refresh();
  return ok(undefined);
}
