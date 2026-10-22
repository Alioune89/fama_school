import "server-only";
import { operationError, type SyncHandlers } from "@/lib/offline/server";

/** Codes renvoyés par public.record_arrival (voir la migration student_arrivals). */
const ARRIVAL_CODES = ["unknownStudent", "dateOutOfRange"] as const;

export const arrivalSyncHandlers: Pick<SyncHandlers, "checkin.arrival"> = {
  "checkin.arrival": async (supabase, op) => {
    const { data, error } = await supabase.rpc("record_arrival", {
      p_operation_id: op.id,
      p_student_id: op.payload.studentId,
      p_scanned_at: op.payload.scannedAt,
    });
    if (error) return operationError(op.id, error, "arrivals.errors", ARRIVAL_CODES);
    return { id: op.id, status: data as "applied" | "duplicate" | "stale" };
  },
};
