import "server-only";
import { operationError, type SyncHandlers } from "@/lib/offline/server";

/** Codes renvoyés par public.submit_roll_call (voir la migration attendance_roll_call). */
const ROLL_CALL_CODES = ["unknownClass", "dateOutOfRange"] as const;

export const attendanceSyncHandlers: Pick<SyncHandlers, "attendance.rollCall"> = {
  "attendance.rollCall": async (supabase, op) => {
    const { classId, date, slot, takenAt, marks } = op.payload;
    const { data, error } = await supabase.rpc("submit_roll_call", {
      p_operation_id: op.id,
      p_class_id: classId,
      p_date: date,
      p_slot: slot,
      p_taken_at: takenAt,
      p_marks: marks,
    });
    if (error) return operationError(op.id, error, "attendance.errors", ROLL_CALL_CODES);
    return { id: op.id, status: data as "applied" | "duplicate" | "stale" };
  },
};
