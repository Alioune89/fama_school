import { z } from "zod";
import { Constants } from "@/lib/supabase/database.types";
import { SLUG_PATTERN } from "@/lib/slug";
import { optionalEmailField, optionalPhoneField, optionalText, requiredText } from "@/lib/validation";

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
