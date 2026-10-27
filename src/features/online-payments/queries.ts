import "server-only";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { ProviderName } from "./providers";

export type OnlinePayment = {
  id: string;
  studentId: string;
  studentName: string;
  provider: ProviderName;
  amount: number;
  status: Enums<"online_payment_status">;
  checkoutUrl: string | null;
  failureReason: string | null;
  paymentId: string | null;
  createdBy: string;
  createdAt: string;
};

/** Un paiement en ligne du parent connecté (la RLS limite à ses propres paiements et à la direction financière). */
export async function getOnlinePayment(id: string): Promise<OnlinePayment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("online_payments")
    .select(
      "id, student_id, provider, amount, status, checkout_url, failure_reason, payment_id, created_by, created_at, student:students(first_name, last_name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    studentId: data.student_id,
    studentName: data.student ? `${data.student.first_name} ${data.student.last_name}` : "",
    provider: data.provider as ProviderName,
    amount: data.amount,
    status: data.status,
    checkoutUrl: data.checkout_url,
    failureReason: data.failure_reason,
    paymentId: data.payment_id,
    createdBy: data.created_by,
    createdAt: data.created_at,
  };
}
