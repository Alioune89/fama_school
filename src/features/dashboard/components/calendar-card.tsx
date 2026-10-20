import { CalendarDays } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { StatusPill } from "@/components/dashboard/status-pill";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { schoolCalendar, todayInDakar } from "../calendar";
import type { DirectionDashboard } from "../queries";

/** Calendrier scolaire : période en cours et son avancement, périodes suivantes, fin d'année. */
export async function CalendarCard({ calendar }: { calendar: DirectionDashboard["calendar"] }) {
  const t = await getTranslations("dashboard.calendar");

  if (!calendar) {
    return (
      <section className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <div className="mt-4 flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-sun-100 text-sun-700">
            <CalendarDays className="size-6" aria-hidden strokeWidth={1.75} />
          </span>
          <p className="text-sm text-muted-foreground">{t("noYear")}</p>
        </div>
      </section>
    );
  }

  const { phase, daysLeft, periods } = schoolCalendar(calendar, todayInDakar());

  return (
    <section className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <StatusPill tone={phase === "during" ? "info" : "neutral"}>
          {phase === "before"
            ? t("daysToStart", { count: daysLeft })
            : phase === "during"
              ? t("daysToEnd", { count: daysLeft })
              : t("yearOver")}
        </StatusPill>
      </div>
      <ol className="mt-4 space-y-4">
        {periods.map((period) => (
          <li key={period.id}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={cn("font-semibold", period.state === "past" ? "text-muted-foreground" : "text-ink")}>
                {period.label}
              </span>
              <span className="tabular text-xs text-muted-foreground">
                {formatDate(period.starts_on)} → {formatDate(period.ends_on)}
              </span>
            </div>
            {period.state === "current" ? (
              <div className="mt-2 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-azure-50" aria-hidden>
                  <div className="h-full rounded-full bg-azure-500" style={{ width: `${period.progress}%` }} />
                </div>
                <span className="tabular text-xs font-semibold text-ink-soft">{t("progress", { value: period.progress })}</span>
              </div>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground">{period.state === "past" ? t("past") : t("upcoming")}</p>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-5 border-t border-line pt-3 text-xs text-muted-foreground">
        {t("yearRange", { start: formatDate(calendar.startsOn), end: formatDate(calendar.endsOn) })}
      </p>
    </section>
  );
}
