import "server-only";
import { operationError, type SyncHandlers } from "@/lib/offline/server";

/** Codes renvoyés par public.submit_grades (voir la migration grades). */
const GRADES_CODES = ["unknownEvaluation", "periodLocked", "invalidGrade"] as const;

export const gradesSyncHandlers: Pick<SyncHandlers, "grades.entry"> = {
  "grades.entry": async (supabase, op) => {
    const { evaluationId, enteredAt, marks } = op.payload;
    const { data, error } = await supabase.rpc("submit_grades", {
      p_operation_id: op.id,
      p_evaluation_id: evaluationId,
      p_entered_at: enteredAt,
      p_marks: marks,
    });
    if (error) return operationError(op.id, error, "grades.errors", GRADES_CODES);
    return { id: op.id, status: data as "applied" | "duplicate" | "stale" };
  },
};
