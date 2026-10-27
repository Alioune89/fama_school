import "server-only";
import type { Enums } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { providerFor, type ProviderName, type ProviderStatus } from "./providers";

type OnlinePaymentRecord = {
  id: string;
  provider: ProviderName;
  amount: number;
  status: Enums<"online_payment_status">;
  provider_token: string | null;
};

const COLUMNS = "id, provider, amount, status, provider_token";

/** Enregistre l'issue d'un paiement (rôle service : public.settle_online_payment). */
export async function settle(id: string, outcome: ProviderStatus) {
  if (outcome.status === "pending") return;
  const { error } = await createAdminClient().rpc("settle_online_payment", {
    p_id: id,
    p_status: outcome.status,
    p_reference: outcome.status === "succeeded" ? outcome.reference : undefined,
    p_reason: outcome.status === "succeeded" ? undefined : (outcome.reason ?? undefined),
  });
  if (error) throw error;
}

/**
 * Demande au fournisseur où en est un paiement en attente et l'enregistre. Seule la réponse du fournisseur
 * fait foi : ni le retour du navigateur ni le contenu d'une notification ne suffisent à encaisser.
 */
async function syncRecord(record: OnlinePaymentRecord) {
  if (record.status !== "pending" || !record.provider_token) return;
  const outcome = await providerFor(record.provider).confirm(record.provider_token, {
    onlinePaymentId: record.id,
    amount: record.amount,
  });
  await settle(record.id, outcome);
}

export async function syncOnlinePayment(id: string) {
  const { data, error } = await createAdminClient().from("online_payments").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  if (data) await syncRecord(data as OnlinePaymentRecord);
}

/** Notification du fournisseur : retrouve le paiement par son jeton, puis le confirme auprès du fournisseur. */
export async function syncByProviderToken(provider: ProviderName, token: string) {
  const { data, error } = await createAdminClient()
    .from("online_payments")
    .select(COLUMNS)
    .eq("provider", provider)
    .eq("provider_token", token)
    .maybeSingle();
  if (error) throw error;
  if (data) await syncRecord(data as OnlinePaymentRecord);
  return Boolean(data);
}
