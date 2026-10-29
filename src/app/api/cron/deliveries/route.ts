import { NextResponse } from "next/server";
import { processDeliveries } from "@/features/notifications/deliveries";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Tâche planifiée (vercel.json) : envois en attente, puis ménage des notifications de plus de 90 jours.
 * Vercel l'appelle avec « Authorization: Bearer CRON_SECRET ».
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const deliveries = await processDeliveries({ force: true });
  const { data: pruned } = await createAdminClient().rpc("prune_notifications");
  return NextResponse.json({ ...deliveries, pruned });
}
