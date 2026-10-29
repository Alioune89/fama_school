import { getTranslations } from "next-intl/server";
import { StatusPill } from "@/components/dashboard/status-pill";
import type { ProgressSummary as Summary } from "@/lib/domain/programme";

/** Barre d'avancement (validés, terminés, en cours) et repère d'avance ou de retard. */
export async function ProgressSummary({ summary, compact = false }: { summary: Summary; compact?: boolean }) {
  const t = await getTranslations("programme");
  const pct = (value: number) => (summary.total ? (value / summary.total) * 100 : 0);
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium text-ink-soft">
          {t("doneCount", { done: summary.validated + summary.done, total: summary.total })}
        </span>
        {summary.total > 0 && (
          <StatusPill tone={summary.state === "behind" ? "warning" : summary.state === "ahead" ? "success" : "info"}>
            {summary.state === "behind"
              ? t("behind", { count: summary.delay })
              : summary.state === "ahead"
                ? t("ahead", { count: -summary.delay })
                : t("onTrack")}
          </StatusPill>
        )}
      </div>
      <div
        className={
          compact ? "flex h-1.5 overflow-hidden rounded-full bg-muted" : "flex h-2.5 overflow-hidden rounded-full bg-muted"
        }
        role="img"
        aria-label={t("barLabel", {
          validated: summary.validated,
          done: summary.done,
          inProgress: summary.inProgress,
          total: summary.total,
        })}
      >
        <span className="bg-success-500" style={{ width: `${pct(summary.validated)}%` }} />
        <span className="bg-azure-500" style={{ width: `${pct(summary.done)}%` }} />
        <span className="bg-azure-200" style={{ width: `${pct(summary.inProgress)}%` }} />
      </div>
    </div>
  );
}
