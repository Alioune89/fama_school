import "server-only";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type Expense = {
  id: string;
  spentOn: string;
  category: Enums<"expense_category">;
  label: string;
  amount: number;
  method: Enums<"payment_method">;
  reference: string | null;
};

/** Dépenses d'un mois (« 2026-10 »), de la plus récente à la plus ancienne. */
export async function listExpenses(schoolId: string, month: string): Promise<Expense[]> {
  const [year, index] = month.split("-").map(Number) as [number, number];
  const next = index === 12 ? `${year + 1}-01` : `${year}-${String(index + 1).padStart(2, "0")}`;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("id, spent_on, category, label, amount, method, reference")
    .eq("school_id", schoolId)
    .gte("spent_on", `${month}-01`)
    .lt("spent_on", `${next}-01`)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw error;
  return (data ?? []).map((e) => ({
    id: e.id,
    spentOn: e.spent_on,
    category: e.category,
    label: e.label,
    amount: e.amount,
    method: e.method,
    reference: e.reference,
  }));
}
