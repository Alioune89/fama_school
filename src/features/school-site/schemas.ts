import { z } from "zod";
import { optionalPhoneField, optionalText, requiredText } from "@/lib/validation";

/** Couleurs d'accent proposées : toutes assez foncées pour un texte blanc lisible (contraste ≥ 4,5:1). */
export const ACCENT_COLORS = {
  azure: "#1570a6",
  green: "#0f7a4a",
  burgundy: "#9b2335",
  violet: "#5b3fa0",
  ochre: "#a15c07",
  slate: "#334155",
} as const;

const ACCENT_VALUES = Object.values(ACCENT_COLORS) as [string, ...string[]];

export const SITE_LIMITS = { stats: 4, fees: 20, faq: 20, gallery: 12 } as const;

export const siteSchema = z.object({
  tagline: optionalText(160),
  about: optionalText(3000),
  admissions: optionalText(2000),
  accentColor: z.enum(ACCENT_VALUES, { error: "validation.invalid" }),
  whatsapp: optionalPhoneField,
  stats: z.array(z.object({ label: requiredText(40), value: requiredText(20) })).max(SITE_LIMITS.stats),
  fees: z
    .array(z.object({ label: requiredText(80), amount: z.number({ error: "validation.invalid" }).int().min(0).max(10_000_000) }))
    .max(SITE_LIMITS.fees),
  faq: z.array(z.object({ question: requiredText(160), answer: requiredText(1000) })).max(SITE_LIMITS.faq),
});

export type SiteInput = z.input<typeof siteSchema>;
