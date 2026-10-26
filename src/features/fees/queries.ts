import "server-only";
import { cache } from "react";
import { defaultSchedule, type BillingSchedule } from "@/lib/domain/fees";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const byName = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true });

export type FeeType = {
  id: string;
  name: string;
  kind: Enums<"fee_kind">;
  frequency: Enums<"fee_frequency">;
  optional: boolean;
  position: number;
};

export type FeeLevel = { id: string; label: string; cycleLabel: string };

export type FeeSchedule = {
  year: { id: string; label: string; startsOn: string };
  schedule: BillingSchedule;
  /** Le calendrier vient de la base (sinon : valeur par défaut, pas encore enregistrée). */
  scheduleSaved: boolean;
  feeTypes: FeeType[];
  levels: FeeLevel[];
  /** Montant par `${levelId}:${feeTypeId}`. */
  rates: Record<string, number>;
};

/** Types de frais actifs de l'école, dans l'ordre d'affichage. */
export const listFeeTypes = cache(async (schoolId: string): Promise<FeeType[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fee_types")
    .select("id, name, kind, frequency, optional, position")
    .eq("school_id", schoolId)
    .eq("active", true);
  if (error) throw error;
  return (data ?? []).sort((a, b) => a.position - b.position || byName(a.name, b.name));
});

/** Grille des frais de l'année en cours : types, niveaux, montants, calendrier des mensualités. */
export const getFeeSchedule = cache(async (schoolId: string): Promise<FeeSchedule | null> => {
  const supabase = await createClient();
  const { data: year, error } = await supabase
    .from("academic_years")
    .select("id, label, starts_on, billing:billing_schedules(installments, first_month)")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();
  if (error) throw error;
  if (!year) return null;

  const [feeTypes, levelsResult, ratesResult] = await Promise.all([
    listFeeTypes(schoolId),
    supabase.from("levels").select("id, label, position, cycle:cycles(label, position)").eq("school_id", schoolId),
    supabase.from("fee_rates").select("level_id, fee_type_id, amount").eq("academic_year_id", year.id),
  ]);
  if (levelsResult.error) throw levelsResult.error;
  if (ratesResult.error) throw ratesResult.error;

  const billing = Array.isArray(year.billing) ? year.billing[0] : year.billing;
  return {
    year: { id: year.id, label: year.label, startsOn: year.starts_on },
    schedule: billing ? { installments: billing.installments, firstMonth: billing.first_month } : defaultSchedule(year.starts_on),
    scheduleSaved: Boolean(billing),
    feeTypes,
    levels: (levelsResult.data ?? [])
      .sort((a, b) => (a.cycle?.position ?? 0) - (b.cycle?.position ?? 0) || a.position - b.position)
      .map((level) => ({ id: level.id, label: level.label, cycleLabel: level.cycle?.label ?? "" })),
    rates: Object.fromEntries((ratesResult.data ?? []).map((r) => [`${r.level_id}:${r.fee_type_id}`, r.amount])),
  };
});

export type StudentFees = {
  yearId: string;
  installments: number;
  feeTypes: FeeType[];
  /** Montant de chaque frais au niveau de la classe de l'élève (frais absents de la grille : non dus). */
  rates: Record<string, number>;
  options: string[];
  discounts: { id: string; kind: Enums<"discount_kind">; percent: number; feeTypeId: string | null; label: string | null }[];
};

/** Frais d'un élève sur l'année en cours, selon le niveau de sa classe actuelle. */
export async function getStudentFees(schoolId: string, studentId: string, classId: string): Promise<StudentFees | null> {
  const supabase = await createClient();
  const [schedule, classResult, optionsResult, discountsResult] = await Promise.all([
    getFeeSchedule(schoolId),
    supabase.from("classes").select("level_id").eq("id", classId).maybeSingle(),
    supabase.from("student_fee_options").select("academic_year_id, fee_type_id").eq("student_id", studentId),
    supabase
      .from("student_discounts")
      .select("id, academic_year_id, kind, percent, fee_type_id, label")
      .eq("student_id", studentId)
      .order("created_at"),
  ]);
  const levelId = classResult.data?.level_id;
  if (!schedule || !levelId) return null;
  const yearId = schedule.year.id;
  return {
    yearId,
    installments: schedule.schedule.installments,
    feeTypes: schedule.feeTypes,
    rates: Object.fromEntries(
      schedule.feeTypes.flatMap((fee) => {
        const amount = schedule.rates[`${levelId}:${fee.id}`];
        return amount ? [[fee.id, amount]] : [];
      }),
    ),
    options: (optionsResult.data ?? []).filter((o) => o.academic_year_id === yearId).map((o) => o.fee_type_id),
    discounts: (discountsResult.data ?? [])
      .filter((d) => d.academic_year_id === yearId)
      .map((d) => ({ id: d.id, kind: d.kind, percent: Number(d.percent), feeTypeId: d.fee_type_id, label: d.label })),
  };
}
