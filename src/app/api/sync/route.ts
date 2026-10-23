import { NextResponse } from "next/server";
import { arrivalSyncHandlers } from "@/features/arrivals/sync";
import { attendanceSyncHandlers } from "@/features/attendance/sync";
import { gradesSyncHandlers } from "@/features/grades/sync";
import { reportSyncHandlers } from "@/features/reports/sync";
import { syncRequestSchema, type SyncResponse } from "@/lib/offline/operations";
import { applyOperations, type SyncHandlers } from "@/lib/offline/server";
import { createClient } from "@/lib/supabase/server";

const handlers: SyncHandlers = {
  ...attendanceSyncHandlers,
  ...reportSyncHandlers,
  ...arrivalSyncHandlers,
  ...gradesSyncHandlers,
};

/**
 * Reçoit les opérations enregistrées hors ligne par les téléphones (src/lib/offline/outbox.ts).
 * Réponses : 200 avec l'issue de chaque opération ; 401 sans session (le téléphone garde sa file) ;
 * 409 si la session n'est pas celle du compte qui a enregistré les opérations.
 */
export async function POST(request: Request) {
  // Requête de l'application uniquement (les navigateurs envoient toujours Origin sur un POST).
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = syncRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (body.data.userId !== userId) return NextResponse.json({ error: "otherUser" }, { status: 409 });

  const results = await applyOperations(supabase, body.data.operations, handlers);
  return NextResponse.json({ results } satisfies SyncResponse);
}
