import { z } from "zod";
import { Constants } from "@/lib/supabase/database.types";
import { SLUG_PATTERN } from "@/lib/slug";
import {
  isoDateField,
  optionalEmailField,
  optionalIsoDateField,
  optionalPhoneField,
  optionalText,
  requiredText,
} from "@/lib/validation";

export const SCHOOL_PLANS = Constants.public.Enums.school_plan;

export const createSchoolSchema = z
  .object({
    name: requiredText(160, 2),
    slug: z.string().trim().max(60, { error: "validation.tooLong" }).regex(SLUG_PATTERN, { error: "validation.invalidSlug" }),
    city: optionalText(80),
    region: optionalText(80),
    plan: z.enum(SCHOOL_PLANS, { error: "validation.required" }),
    directorName: requiredText(120, 2),
    directorPhone: optionalPhoneField,
    directorEmail: optionalEmailField,
  })
  .superRefine((value, ctx) => {
    if (!value.directorPhone && !value.directorEmail) {
      ctx.addIssue({ code: "custom", path: ["directorPhone"], message: "validation.phoneOrEmail" });
    }
  });

export type CreateSchoolInput = z.input<typeof createSchoolSchema>;

export const SCHOOL_STATUSES = Constants.public.Enums.school_status;

export const schoolPlanSchema = z.object({
  schoolId: z.uuid(),
  plan: z.enum(SCHOOL_PLANS, { error: "validation.required" }),
  status: z.enum(SCHOOL_STATUSES, { error: "validation.required" }),
});

export const SUBSCRIPTION_METHODS = Constants.public.Enums.subscription_payment_method;

/** Fin de la période couverte (pilote ou abonnement), fixée à la main ; vide : à définir. */
export const subscriptionEndSchema = z.object({ schoolId: z.uuid(), endsOn: optionalIsoDateField });

export const subscriptionPaymentSchema = z
  .object({
    schoolId: z.uuid(),
    amount: z.coerce
      .number({ error: "validation.required" })
      .int({ error: "validation.invalid" })
      .min(1, { error: "validation.invalid" })
      .max(100_000_000, { error: "validation.invalid" }),
    method: z.enum(SUBSCRIPTION_METHODS, { error: "validation.required" }),
    paidOn: isoDateField,
    coversUntil: isoDateField,
    reference: optionalText(80),
  })
  .refine((value) => value.coversUntil >= value.paidOn, {
    path: ["coversUntil"],
    error: "platform.subscription.coversBeforePaid",
  });
export type SubscriptionPaymentInput = z.input<typeof subscriptionPaymentSchema>;
