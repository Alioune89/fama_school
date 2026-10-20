"use server";

import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { demoRequestSchema, type DemoRequestInput } from "./schemas";

/** Demande de démo déposée par un visiteur ; l'équipe Fama School la retrouve dans l'espace plateforme. */
export async function submitDemoRequest(input: DemoRequestInput): Promise<ActionResult> {
  const parsed = demoRequestSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  // Un robot remplit le champ piège : on lui répond comme à tout le monde, sans rien enregistrer.
  if (v.website) return ok(undefined);

  const supabase = await createClient();
  const { error } = await supabase.from("demo_requests").insert({
    full_name: v.fullName,
    school_name: v.schoolName,
    role: v.role,
    phone: v.phone,
    email: v.email,
    city: v.city,
    students_range: v.studentsRange,
    message: v.message,
  });
  if (error)
    return fail(error.code === "P0001" && error.message === "tooManyRequests" ? "landing.demo.tooMany" : "errors.unknown");
  return ok(undefined);
}
