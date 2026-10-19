import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  success: "bg-success-50 text-success-700 [--dot:var(--color-success-500)]",
  warning: "bg-warning-50 text-warning-700 [--dot:var(--color-warning-500)]",
  danger: "bg-danger-50 text-danger-700 [--dot:var(--color-danger-500)]",
  info: "bg-azure-50 text-azure-700 [--dot:var(--color-azure-500)]",
  lavender: "bg-lavender-50 text-lavender-700 [--dot:var(--color-lavender-500)]",
  neutral: "bg-muted text-ink-soft [--dot:var(--color-ink-soft)]",
} as const;

export type StatusTone = keyof typeof tones;

/** Pastille de statut des maquettes : point coloré + libellé (Payé, En attente, En retard…). */
export function StatusPill({ tone, children, className }: { tone: StatusTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-(--dot)" aria-hidden />
      {children}
    </span>
  );
}
