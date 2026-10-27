import "server-only";

/**
 * Fournisseurs de paiement en ligne. ONLINE_PAYMENT_PROVIDER choisit le fournisseur des nouveaux paiements :
 * « simulated » (page de démonstration, aucun argent ne circule) ou « paydunya » (PAYDUNYA_MASTER_KEY,
 * PAYDUNYA_PRIVATE_KEY, PAYDUNYA_TOKEN ; PAYDUNYA_MODE « test » ou « live »). Sans valeur, le paiement en ligne
 * est fermé : la démonstration délivre de vrais reçus, elle ne s'ouvre jamais par défaut.
 */
export type ProviderName = "simulated" | "paydunya";

export type CheckoutRequest = {
  onlinePaymentId: string;
  amount: number;
  description: string;
  storeName: string;
  /** Page de suivi du paiement (retour et abandon). */
  returnUrl: string;
  /** Notification de paiement envoyée par le fournisseur au serveur. */
  callbackUrl: string;
  /** Page de démonstration du fournisseur simulé. */
  simulationUrl: string;
};

export type Checkout = { token: string; url: string };

/** État d'un paiement chez le fournisseur ; « succeeded » seulement si le montant et le paiement concordent. */
export type ProviderStatus =
  { status: "pending" } | { status: "succeeded"; reference: string } | { status: "failed" | "cancelled"; reason: string | null };

export interface PaymentProvider {
  name: ProviderName;
  createCheckout(request: CheckoutRequest): Promise<Checkout>;
  confirm(token: string, expected: { onlinePaymentId: string; amount: number }): Promise<ProviderStatus>;
}

/** Démonstration : la page de simulation décide de l'issue (voir simulateOnlinePayment). */
const simulated: PaymentProvider = {
  name: "simulated",
  async createCheckout(request) {
    return { token: `SIM-${request.onlinePaymentId}`, url: request.simulationUrl };
  },
  async confirm() {
    return { status: "pending" };
  },
};

function paydunyaConfig() {
  const masterKey = process.env.PAYDUNYA_MASTER_KEY;
  const privateKey = process.env.PAYDUNYA_PRIVATE_KEY;
  const token = process.env.PAYDUNYA_TOKEN;
  if (!masterKey || !privateKey || !token) {
    throw new Error("Clés PayDunya manquantes : PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY, PAYDUNYA_TOKEN.");
  }
  const base =
    process.env.PAYDUNYA_MODE === "live" ? "https://app.paydunya.com/api/v1" : "https://app.paydunya.com/sandbox-api/v1";
  const headers = {
    "Content-Type": "application/json",
    "PAYDUNYA-MASTER-KEY": masterKey,
    "PAYDUNYA-PRIVATE-KEY": privateKey,
    "PAYDUNYA-TOKEN": token,
  };
  return { base, headers };
}

type PaydunyaConfirmation = {
  response_code?: string;
  status?: "pending" | "completed" | "cancelled" | "failed";
  fail_reason?: string;
  invoice?: { total_amount?: number | string; token?: string };
  custom_data?: { online_payment_id?: string };
};

/** PayDunya, API « checkout-invoice » : page de paiement hébergée (Wave, Orange Money, Free Money, carte). */
const paydunya: PaymentProvider = {
  name: "paydunya",
  async createCheckout(request) {
    const { base, headers } = paydunyaConfig();
    const response = await fetch(`${base}/checkout-invoice/create`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        invoice: { total_amount: request.amount, description: request.description },
        store: { name: request.storeName },
        actions: { return_url: request.returnUrl, cancel_url: request.returnUrl, callback_url: request.callbackUrl },
        custom_data: { online_payment_id: request.onlinePaymentId },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await response.json().catch(() => null)) as {
      response_code?: string;
      response_text?: string;
      token?: string;
    } | null;
    if (!response.ok || body?.response_code !== "00" || !body.token || !body.response_text?.startsWith("https://")) {
      throw new Error(`PayDunya : création refusée (${response.status} ${body?.response_code ?? ""}).`);
    }
    return { token: body.token, url: body.response_text };
  },
  async confirm(token, expected) {
    const { base, headers } = paydunyaConfig();
    const response = await fetch(`${base}/checkout-invoice/confirm/${encodeURIComponent(token)}`, {
      headers,
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await response.json().catch(() => null)) as PaydunyaConfirmation | null;
    if (!response.ok || body?.response_code !== "00") return { status: "pending" };
    switch (body.status) {
      case "completed": {
        const paid = Number(body.invoice?.total_amount);
        const sameIntent = body.custom_data?.online_payment_id === expected.onlinePaymentId;
        if (paid !== expected.amount || !sameIntent) {
          // Paiement reçu mais incohérent : laissé en attente pour vérification par l'école.
          console.error(`PayDunya : paiement ${token} incohérent (montant ${paid}, attendu ${expected.amount}).`);
          return { status: "pending" };
        }
        return { status: "succeeded", reference: token };
      }
      case "cancelled":
        return { status: "cancelled", reason: body.fail_reason ?? null };
      case "failed":
        return { status: "failed", reason: body.fail_reason ?? null };
      default:
        return { status: "pending" };
    }
  },
};

const PROVIDERS: Record<ProviderName, PaymentProvider> = { simulated, paydunya };

/** Fournisseur des nouveaux paiements ; null : paiement en ligne fermé. */
export function activeProvider(): PaymentProvider | null {
  const name = process.env.ONLINE_PAYMENT_PROVIDER;
  return name === "paydunya" || name === "simulated" ? PROVIDERS[name] : null;
}

/** Fournisseur d'un paiement déjà lancé. */
export function providerFor(name: ProviderName): PaymentProvider {
  return PROVIDERS[name];
}
