"use server";

import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { getCurrentUser } from "@/lib/auth/session";
import type { Enums } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requestOrigin } from "@/lib/request-origin";
import { routing } from "@/i18n/routing";
import { activeProvider } from "./providers";
import { getOnlinePayment } from "./queries";
import { settle, syncOnlinePayment } from "./service";

/** Codes de public.start_online_payment (migration online_payments). */
const START_CODES = ["unknownStudent", "nothingDue", "tooManyAttempts"] as const;

const startSchema = z.object({
  studentId: z.uuid(),
  invoiceIds: z.array(z.uuid()).min(1, { error: "payments.errors.noInvoice" }).max(100),
  // Langue de l'interface, pour revenir sur la bonne page (une action ne lit pas la langue de la route).
  locale: z.enum(routing.locales).catch(routing.defaultLocale),
});

/**
 * Le parent paie en ligne les factures choisies : paiement « en attente » pour leur reste dû, puis page de
 * paiement du fournisseur, où le navigateur est envoyé.
 */
export async function startOnlinePayment(input: z.input<typeof startSchema>): Promise<ActionResult<{ url: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail("errors.forbidden");
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const provider = activeProvider();
  if (!provider) return fail("onlinePayments.errors.closed");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_online_payment", {
    p_student_id: parsed.data.studentId,
    p_invoice_ids: parsed.data.invoiceIds,
    p_provider: provider.name,
  });
  if (error) {
    if (error.code === "P0001" && (START_CODES as readonly string[]).includes(error.message)) {
      return fail(`onlinePayments.errors.${error.message}`);
    }
    if (error.code === "P0001" && error.message === "forbidden") return fail("errors.forbidden");
    return fail("errors.unknown");
  }
  const started = data as { id: string; amount: number; schoolName: string; studentName: string };

  const origin = await requestOrigin();
  const prefix = parsed.data.locale === routing.defaultLocale ? "" : `/${parsed.data.locale}`;
  const page = `${origin}${prefix}/parent/paiements/${started.id}`;
  try {
    const checkout = await provider.createCheckout({
      onlinePaymentId: started.id,
      amount: started.amount,
      description: `Frais de scolarité – ${started.studentName}`,
      storeName: started.schoolName,
      returnUrl: page,
      callbackUrl: `${origin}/api/paiements/${provider.name}`,
      simulationUrl: `${page}/simulation`,
    });
    const { error: checkoutError } = await createAdminClient().rpc("set_online_payment_checkout", {
      p_id: started.id,
      p_token: checkout.token,
      p_checkout_url: checkout.url,
    });
    if (checkoutError) throw checkoutError;
    return ok({ url: checkout.url });
  } catch (cause) {
    console.error(cause);
    await settle(started.id, { status: "failed", reason: "providerUnavailable" }).catch(() => undefined);
    return fail("onlinePayments.errors.providerUnavailable");
  }
}

/** État d'un paiement du parent, après avoir interrogé le fournisseur s'il est encore en attente. */
export async function refreshOnlinePayment(
  id: string,
): Promise<ActionResult<{ status: Enums<"online_payment_status">; paymentId: string | null }>> {
  const user = await getCurrentUser();
  if (!user || !z.uuid().safeParse(id).success) return fail("errors.forbidden");
  let payment = await getOnlinePayment(id);
  if (!payment || payment.createdBy !== user.id) return fail("errors.forbidden");
  if (payment.status === "pending") {
    await syncOnlinePayment(id);
    payment = (await getOnlinePayment(id))!;
  }
  return ok({ status: payment.status, paymentId: payment.paymentId });
}

const simulationSchema = z.object({ id: z.uuid(), outcome: z.enum(["succeeded", "failed", "cancelled"]) });

/** Page de démonstration : le parent choisit l'issue du paiement. Désactivée dès qu'un vrai fournisseur est actif. */
export async function simulateOnlinePayment(input: z.input<typeof simulationSchema>): Promise<ActionResult> {
  const user = await getCurrentUser();
  const parsed = simulationSchema.safeParse(input);
  if (!user || !parsed.success || activeProvider()?.name !== "simulated") return fail("errors.forbidden");
  const payment = await getOnlinePayment(parsed.data.id);
  if (!payment || payment.createdBy !== user.id || payment.provider !== "simulated") return fail("errors.forbidden");
  if (payment.status !== "pending") return ok(undefined);

  const { outcome } = parsed.data;
  await settle(
    payment.id,
    outcome === "succeeded"
      ? { status: "succeeded", reference: `SIM-${payment.id.slice(0, 8).toUpperCase()}` }
      : { status: outcome, reason: outcome === "failed" ? "simulatedFailure" : null },
  );
  return ok(undefined);
}
