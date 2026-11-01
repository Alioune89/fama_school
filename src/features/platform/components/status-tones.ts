import type { StatusTone } from "@/components/dashboard/status-pill";
import type { Enums } from "@/lib/supabase/database.types";

export const SCHOOL_STATUS_TONES: Record<Enums<"school_status">, StatusTone> = {
  trial: "info",
  active: "success",
  suspended: "danger",
  archived: "neutral",
};
