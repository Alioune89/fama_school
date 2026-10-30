"use server";

import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const passwordSchema = z
  .object({
    current: z.string().min(1, { error: "validation.required" }),
    password: z
      .string()
      .min(8, { error: "profile.password.errors.tooShort" })
      .max(72, { error: "validation.tooLong" })
      .regex(/[a-zA-Z]/, { error: "profile.password.errors.lettersDigits" })
      .regex(/\d/, { error: "profile.password.errors.lettersDigits" }),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, { error: "profile.password.errors.mismatch", path: ["confirm"] })
  .refine((value) => value.password !== value.current, { error: "profile.password.errors.same", path: ["password"] });

/** Changement du mot de passe d'un compte e-mail ; le mot de passe actuel est vérifié d'abord. */
export async function changePassword(input: z.input<typeof passwordSchema>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user?.email) return fail("errors.forbidden");
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error: checkError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  });
  if (checkError) return fail("validation.form", { current: "profile.password.errors.wrongCurrent" });

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "weak_password") return fail("validation.form", { password: "profile.password.errors.lettersDigits" });
    if (error.code === "same_password") return fail("validation.form", { password: "profile.password.errors.same" });
    return fail("errors.unknown");
  }
  return ok(undefined);
}
