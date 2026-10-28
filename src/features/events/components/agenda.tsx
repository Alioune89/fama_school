import { BookOpenCheck, CalendarDays, Flag, PartyPopper, Sun, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AgendaItem } from "../queries";
import { DeleteEventButton } from "./delete-event-button";

const STYLE: Record<AgendaItem["kind"], { icon: typeof Sun; tone: string }> = {
  holiday: { icon: Sun, tone: "bg-sun-100 text-sun-700" },
  exam: { icon: Flag, tone: "bg-lavender-100 text-lavender-700" },
  meeting: { icon: Users, tone: "bg-azure-100 text-azure-700" },
  event: { icon: PartyPopper, tone: "bg-success-50 text-success-700" },
  composition: { icon: BookOpenCheck, tone: "bg-lavender-100 text-lavender-700" },
  period: { icon: CalendarDays, tone: "bg-azure-50 text-azure-700" },
};

const monthKey = (date: string) => date.slice(0, 7);
const monthTitle = (month: string) =>
  new Date(`${month}-01T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

/** Agenda par mois : date, type (icône et libellé), titre, détail ; suppression pour la direction. */
export async function Agenda({ items, manage = false }: { items: AgendaItem[]; manage?: boolean }) {
  const t = await getTranslations("events");
  if (items.length === 0) {
    return <EmptyState icon={CalendarDays} title={t("empty")} body={t(manage ? "emptyHintManage" : "emptyHint")} />;
  }
  const sorted = [...items].sort((a, b) => a.startsOn.localeCompare(b.startsOn) || a.title.localeCompare(b.title, "fr"));
  const months = [...new Set(sorted.map((item) => monthKey(item.startsOn)))];
  const dateLabel = (item: AgendaItem) =>
    item.endsOn === item.startsOn
      ? formatDate(item.startsOn, { weekday: "short", day: "numeric", month: "short" })
      : t("range", {
          from: formatDate(item.startsOn, { day: "numeric", month: "short" }),
          to: formatDate(item.endsOn, { day: "numeric", month: "short" }),
        });

  return (
    <div className="space-y-6">
      {months.map((month) => (
        <section key={month} aria-labelledby={`month-${month}`} className="rounded-xl bg-white shadow-card ring-1 ring-line/70">
          <h2 id={`month-${month}`} className="border-b border-line px-5 py-3 text-base font-semibold capitalize">
            {monthTitle(month)}
          </h2>
          <ul className="divide-y divide-line">
            {sorted
              .filter((item) => monthKey(item.startsOn) === month)
              .map((item) => {
                const { icon: Icon, tone } = STYLE[item.kind];
                return (
                  <li key={`${item.kind}:${item.id}`} className="flex items-start gap-3 px-5 py-3">
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", tone)}>
                      <Icon className="size-4.5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {[
                          dateLabel(item),
                          t(`kinds.${item.kind}`),
                          item.detail,
                          item.staffOnly && item.editable ? t("staffOnlyShort") : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {manage && item.editable && <DeleteEventButton id={item.id} label={item.title} />}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
