import type { StatusTone } from "@/components/dashboard/status-pill";
import type { PreregistrationStatus } from "../schemas";

export const STATUS_TONES: Record<PreregistrationStatus, StatusTone> = {
  pending: "warning",
  accepted: "info",
  rejected: "neutral",
  enrolled: "success",
};
