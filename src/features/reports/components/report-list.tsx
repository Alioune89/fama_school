import { BookX, Backpack, HeartPulse, MessageSquareWarning, TriangleAlert, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { formatDate, formatTime } from "@/lib/format";
import type { ReportCategory } from "@/lib/offline/operations";
import { cn } from "@/lib/utils";
import type { StudentReport } from "../queries";

/** Icône + libellé : le type ne repose jamais sur la couleur seule. */
export const CATEGORY_STYLE: Record<ReportCategory, { icon: LucideIcon; className: string }> = {
  behavior: { icon: TriangleAlert, className: "bg-lavender-50 text-lavender-700" },
  health: { icon: HeartPulse, className: "bg-danger-50 text-danger-700" },
  homework: { icon: BookX, className: "bg-warning-50 text-warning-700" },
  equipment: { icon: Backpack, className: "bg-azure-50 text-azure-700" },
  other: { icon: MessageSquareWarning, className: "bg-muted text-ink-soft" },
};

export async function CategoryBadge({ category }: { category: ReportCategory }) {
  const t = await getTranslations("reports.categories");
  const { icon: Icon, className } = CATEGORY_STYLE[category];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", className)}>
      <Icon className="size-3.5" aria-hidden />
      {t(category)}
    </span>
  );
}

/**
 * Signalements : type, date et heure, enseignant, classe et motif.
 * `showStudent` affiche l'élève concerné (liste de l'enseignant) ; inutile sur la fiche d'un élève.
 */
export async function ReportList({
  reports,
  showStudent = false,
  emptyLabel,
}: {
  reports: StudentReport[];
  showStudent?: boolean;
  emptyLabel: string;
}) {
  const t = await getTranslations("reports");
  if (reports.length === 0) return <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>;

  return (
    <ul className="mt-3 divide-y divide-line" aria-label={t("listLabel")}>
      {reports.map((report) => {
        return (
          <li key={report.id} className="space-y-1.5 py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={report.category} />
              <span className="text-xs text-muted-foreground">
                {t("when", {
                  date: formatDate(report.occurredAt, { weekday: "long", day: "numeric", month: "long" }),
                  time: formatTime(report.occurredAt),
                })}
              </span>
            </div>
            {showStudent && <p className="font-semibold text-ink">{report.studentName}</p>}
            <p className="text-sm whitespace-pre-line text-ink">{report.message}</p>
            <p className="text-xs text-muted-foreground">
              {t("byIn", { author: report.authorName || t("unknownAuthor"), className: report.className })}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
