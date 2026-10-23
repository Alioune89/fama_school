import "server-only";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type Verification =
  | {
      status: "valid";
      code: string;
      school: string;
      generatedAt: string;
      student: { firstName: string; lastName: string; matricule: string };
      className: string;
      periodLabel: string;
      academicYear: string;
      scale: "ten" | "twenty" | "appreciation";
      general: number | null;
      rank: { rank: number; exAequo: boolean } | null;
      classSize: number;
      mention: "felicitations" | "encouragements" | "tableauHonneur" | null;
    }
  | { status: "notFound" }
  | { status: "tooManyAttempts" };

/** Adresse du visiteur (première de x-forwarded-for, posée par Vercel) : clé des limites d'essais. */
async function clientKey() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Bulletin authentique correspondant au code (public.verify_report_card, limites d'essais comprises). */
export async function verifyReportCard(code: string): Promise<Verification> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_report_card", { p_code: code, p_client: await clientKey() });
  if (error) throw error;
  return data as Verification;
}
