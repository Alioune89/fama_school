import "server-only";

/**
 * Fournisseurs d'envoi par SMS et WhatsApp. NOTIFICATION_CHANNELS choisit le fournisseur :
 * « log » (démonstration : rien ne part, l'envoi est seulement noté) ou « twilio » (TWILIO_ACCOUNT_SID,
 * TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM, TWILIO_WHATSAPP_FROM). Sans valeur, l'envoi est fermé.
 */
export type Channel = "sms" | "whatsapp";

export type SendResult = { ok: true; providerId: string } | { ok: false; error: string };

export interface ChannelProvider {
  name: "log" | "twilio";
  send(channel: Channel, to: string, text: string): Promise<SendResult>;
}

const log: ChannelProvider = {
  name: "log",
  async send(channel, to, text) {
    console.info(`[envoi ${channel} simulé] ${to} : ${text.replace(/\s+/g, " ").slice(0, 160)}`);
    return { ok: true, providerId: `LOG-${Date.now().toString(36)}` };
  },
};

/** Twilio, API « Messages » : SMS, et WhatsApp (préfixe « whatsapp: » des deux numéros). */
const twilio: ChannelProvider = {
  name: "twilio",
  async send(channel, to, text) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = channel === "sms" ? process.env.TWILIO_SMS_FROM : process.env.TWILIO_WHATSAPP_FROM;
    if (!sid || !token || !from) return { ok: false, error: `Twilio : configuration ${channel} incomplète.` };
    const prefix = channel === "whatsapp" ? "whatsapp:" : "";
    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: `${prefix}${to}`, From: `${prefix}${from.replace(/^whatsapp:/, "")}`, Body: text }),
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await response.json().catch(() => null)) as { sid?: string; message?: string; code?: number } | null;
      if (!response.ok || !body?.sid)
        return { ok: false, error: `Twilio ${response.status} ${body?.code ?? ""} ${body?.message ?? ""}`.trim() };
      return { ok: true, providerId: body.sid };
    } catch (cause) {
      return { ok: false, error: cause instanceof Error ? cause.message : "Twilio injoignable" };
    }
  },
};

/** Fournisseur actif ; null : envoi par SMS et WhatsApp fermé. */
export function activeChannelProvider(): ChannelProvider | null {
  const name = process.env.NOTIFICATION_CHANNELS;
  return name === "twilio" ? twilio : name === "log" ? log : null;
}
