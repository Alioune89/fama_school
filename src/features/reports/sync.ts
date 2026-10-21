import "server-only";
import { operationError, type SyncHandlers } from "@/lib/offline/server";

/** Codes renvoyés par public.submit_student_report (voir la migration student_reports). */
const REPORT_CODES = ["unknownStudent", "invalidMessage"] as const;

export const reportSyncHandlers: Pick<SyncHandlers, "student.report"> = {
  "student.report": async (supabase, op) => {
    const { studentId, classId, category, message, occurredAt } = op.payload;
    const { data, error } = await supabase.rpc("submit_student_report", {
      p_operation_id: op.id,
      p_student_id: studentId,
      p_class_id: classId,
      p_category: category,
      p_message: message,
      p_occurred_at: occurredAt,
    });
    if (error) return operationError(op.id, error, "reports.errors", REPORT_CODES);
    return { id: op.id, status: data as "applied" | "duplicate" };
  },
};
