import { z } from "zod";
import { normalizePhone } from "./phone";

/** Champs réutilisables ; les messages sont des clés de traduction (namespace « validation »). */

export const requiredText = (max = 120, min = 1) =>
  z
    .string({ error: "validation.required" })
    .trim()
    .min(1, { error: "validation.required" })
    .min(min, { error: "validation.tooShort" })
    .max(max, { error: "validation.tooLong" });

export const optionalText = (max = 120) =>
  z
    .string()
    .trim()
    .max(max, { error: "validation.tooLong" })
    .optional()
    .transform((value) => (value ? value : null));

/** Numéro de téléphone obligatoire, normalisé en E.164 (+221…). */
export const phoneField = z
  .string({ error: "validation.required" })
  .trim()
  .min(1, { error: "validation.required" })
  .transform((value, ctx) => {
    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "validation.invalidPhone" });
      return z.NEVER;
    }
    return phone;
  });

/** Numéro facultatif : vide → null. */
export const optionalPhoneField = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (!value) return null;
    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "validation.invalidPhone" });
      return z.NEVER;
    }
    return phone;
  });

export const optionalEmailField = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((value, ctx) => {
    if (!value) return null;
    if (!z.email().safeParse(value).success) {
      ctx.addIssue({ code: "custom", message: "validation.invalidEmail" });
      return z.NEVER;
    }
    return value;
  });

/** Date « AAAA-MM-JJ » (champ <input type="date">). */
export const isoDateField = z.iso.date({ error: "validation.invalidDate" });

export const optionalIsoDateField = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (!value) return null;
    if (!z.iso.date().safeParse(value).success) {
      ctx.addIssue({ code: "custom", message: "validation.invalidDate" });
      return z.NEVER;
    }
    return value;
  });
