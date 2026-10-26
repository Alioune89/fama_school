import { z } from "zod";
import { Constants } from "@/lib/supabase/database.types";
import { requiredText } from "@/lib/validation";

export const FEE_KINDS = Constants.public.Enums.fee_kind;
export const FEE_FREQUENCIES = Constants.public.Enums.fee_frequency;

export const feeTypeSchema = z.object({
  id: z.uuid().optional(),
  name: requiredText(60, 2),
  kind: z.enum(FEE_KINDS, { error: "validation.required" }),
  frequency: z.enum(FEE_FREQUENCIES, { error: "validation.required" }),
  optional: z.boolean(),
});
export type FeeTypeInput = z.input<typeof feeTypeSchema>;

/** Montant saisi dans la grille : « 25 000 », « 25000 » ou vide (aucun frais). */
export const amountField = z
  .string()
  .transform((value) => value.replace(/[\s  .]/g, ""))
  .refine((value) => value === "" || /^\d{1,8}$/.test(value), { error: "fees.errors.amount" })
  .transform((value) => (value === "" ? 0 : Number(value)))
  .refine((value) => value <= 10_000_000, { error: "fees.errors.amount" });

export const feeGridSchema = z.object({
  yearId: z.uuid(),
  installments: z.coerce.number().int().min(1).max(12),
  firstMonth: z.string().regex(/^\d{4}-\d{2}-01$/, { error: "validation.invalid" }),
  rates: z.array(z.object({ levelId: z.uuid(), feeTypeId: z.uuid(), amount: amountField })).max(2000),
});
export type FeeGridInput = z.input<typeof feeGridSchema>;

export const DISCOUNT_KINDS = Constants.public.Enums.discount_kind;

export const discountSchema = z.object({
  studentId: z.uuid(),
  yearId: z.uuid(),
  kind: z.enum(DISCOUNT_KINDS, { error: "validation.required" }),
  percent: z.coerce
    .number({ error: "fees.errors.percent" })
    .refine((value) => value > 0 && value <= 100 && Number.isInteger(value * 100), { error: "fees.errors.percent" }),
  /** Frais concerné ; vide : toutes les mensualités. */
  feeTypeId: z.union([z.literal(""), z.uuid()]).transform((value) => value || null),
});
export type DiscountInput = z.input<typeof discountSchema>;
