import { z } from "zod";
import { Constants } from "@/lib/supabase/database.types";
import { optionalEmailField, optionalPhoneField, optionalText, requiredText } from "@/lib/validation";

export const STAFF_DIRECTORY_ROLES = ["director", "censor", "supervisor", "accountant", "secretary", "owner"] as const;

const staffFields = {
  fullName: requiredText(120, 2),
  phone: optionalPhoneField,
  email: optionalEmailField,
  title: optionalText(80),
  contract: z.enum(Constants.public.Enums.staff_contract).nullable(),
};

export const staffMemberSchema = z
  .object({ ...staffFields, role: z.enum(Constants.public.Enums.app_role).refine((role) => role !== "parent" && role !== "driver") })
  .superRefine((value, ctx) => {
    if (!value.phone && !value.email) ctx.addIssue({ code: "custom", path: ["phone"], message: "validation.phoneOrEmail" });
  });
export type StaffMemberInput = z.input<typeof staffMemberSchema>;

export const updateStaffMemberSchema = z
  .object({ id: z.uuid(), ...staffFields })
  .superRefine((value, ctx) => {
    if (!value.phone && !value.email) ctx.addIssue({ code: "custom", path: ["phone"], message: "validation.phoneOrEmail" });
  });
export type UpdateStaffMemberInput = z.input<typeof updateStaffMemberSchema>;

export const assignmentSchema = z.object({ staffId: z.uuid(), classId: z.uuid(), subjectId: z.uuid() });
export type AssignmentInput = z.input<typeof assignmentSchema>;
