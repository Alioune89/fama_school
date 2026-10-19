/** Codes d'erreur renvoyés au client, traduits dans messages/*.json (auth.errors). */
export type AuthErrorCode =
  | "invalidPhone"
  | "invalidCode"
  | "invalidCredentials"
  | "invalidEmail"
  | "passwordRequired"
  | "rateLimited"
  | "smsFailed"
  | "unknown";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: AuthErrorCode };

/** Traduit les codes d'erreur de Supabase Auth en messages compréhensibles par un parent. */
export function mapAuthError(error: { code?: string; status?: number; message?: string }): AuthErrorCode {
  switch (error.code) {
    case "otp_expired":
    case "otp_disabled":
      return "invalidCode";
    case "invalid_credentials":
    case "email_not_confirmed":
      return "invalidCredentials";
    case "over_request_rate_limit":
    case "over_sms_send_rate_limit":
    case "over_email_send_rate_limit":
      return "rateLimited";
    case "sms_send_failed":
    case "phone_provider_disabled":
      return "smsFailed";
    case "validation_failed":
      return "invalidPhone";
  }
  if (error.status === 429) return "rateLimited";
  return "unknown";
}

/** N'autorise que les redirections internes (pas d'URL externe ni de « //domaine »). */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  if (next.startsWith("/connexion")) return null;
  return next;
}
