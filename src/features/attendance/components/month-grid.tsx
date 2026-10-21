import { ChevronLeft, ChevronRight, Grid3x3 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import type { AttendanceSlot, AttendanceStatus } from "@/lib/offline/operations";
import { cn } from "@/lib/utils";
import type { MonthGrid } from "../direction-queries";
import { dayCell, shiftMonth, type DayCell } from "../report";

/** Lettre + couleur : le statut ne repose jamais sur la couleur seule (lecture daltonienne, impression). */
const CELL: Record<DayCell["kind"], { letter: string; className: string }> = {
  none: { letter: "", className: "bg-transparent" },
  present: { letter: "·", className: "bg-success-50 text-success-700" },
  late: { letter: "R", className: "bg-warning-500 text-ink" },
  halfAbsent: { letter: "½", className: "bg-danger-50 text-danger-700 ring-1 ring-inset ring-danger-500" },
  absent: { letter: "A", className: "bg-danger-500 text-white" },
};

export async function MonthNav({ classId, month, currentMonth }: { classId: string; month: string; currentMonth: string }) {
  const t = await getTranslations("attendance.direction");
  const href = (value: string) => `/direction/presences/grille?classe=${classId}&mois=${value}`;
  const next = shiftMonth(month, 1);
  return (
    <div className="flex items-center gap-2">
      <Link
        href={href(shiftMonth(month, -1))}
        className={buttonVariants({ variant: "outline", size: "icon" })}
        aria-label={t("previousMonth")}
      >
        <ChevronLeft aria-hidden />
      </Link>
      <span className="min-w-32 text-center text-sm font-semibold text-ink capitalize">
        {formatDate(`${month}-01`, { month: "long", year: "numeric" })}
      </span>
      {next <= currentMonth ? (
        <Link href={href(next)} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label={t("nextMonth")}>
          <ChevronRight aria-hidden />
        </Link>
      ) : (
        <span className={cn(buttonVariants({ variant: "outline", size: "icon" }), "pointer-events-none opacity-40")} aria-hidden>
          <ChevronRight />
        </span>
      )}
    </div>
  );
}

/** Grille du mois : une ligne par élève, une colonne par jour de classe, totaux en fin de ligne. */
export async function MonthGridTable({ grid }: { grid: MonthGrid }) {
  const t = await getTranslations("attendance.direction");
  const tSlots = await getTranslations("attendance.slots");
  const tStatuses = await getTranslations("attendance.statuses");

  if (grid.students.length === 0) return <EmptyState icon={Grid3x3} title={t("gridNoStudents")} />;
  if (grid.sessionCount === 0) return <EmptyState icon={Grid3x3} title={t("gridNoRollCall")} body={t("gridNoRollCallHint")} />;

  const describe = (cell: DayCell) =>
    (Object.entries(cell.marks) as [AttendanceSlot, AttendanceStatus][])
      .map(([slot, status]) => `${tSlots(slot)} : ${tStatuses(status).toLowerCase()}`)
      .join(", ") || t("noRollCall");

  return (
    <div className="space-y-4">
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-soft" aria-label={t("legend")}>
        {(["present", "late", "halfAbsent", "absent", "none"] as const).map((kind) => (
          <li key={kind} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-md text-xs font-bold",
                CELL[kind].className,
                kind === "none" && "ring-1 ring-line ring-inset",
              )}
              aria-hidden
            >
              {CELL[kind].letter}
            </span>
            {t(`cell.${kind}`)}
          </li>
        ))}
      </ul>

      <div className="overflow-x-auto rounded-xl bg-white shadow-card ring-1 ring-line/70">
        <table className="text-sm">
          <thead className="text-xs font-semibold text-ink-soft">
            <tr className="border-b border-line">
              <th scope="col" className="sticky left-0 z-10 bg-white px-4 py-3 text-left">
                {t("student")}
              </th>
              {grid.days.map((day) => (
                <th key={day} scope="col" className="px-0.5 py-2 text-center font-medium">
                  <span className="block text-[10px] text-muted-foreground uppercase">
                    {formatDate(day, { weekday: "narrow" })}
                  </span>
                  <span className="tabular block">{Number(day.slice(8))}</span>
                </th>
              ))}
              <th scope="col" className="px-3 py-3 text-right whitespace-nowrap" title={t("absencesTotalHint")}>
                {t("absencesTotal")}
              </th>
              <th scope="col" className="px-3 py-3 text-right whitespace-nowrap">
                {t("latesTotal")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {grid.students.map((student) => {
              const name = `${student.firstName} ${student.lastName}`;
              return (
                <tr key={student.id} className="hover:bg-azure-50/50">
                  <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-1.5 text-left font-normal whitespace-nowrap">
                    <Link href={`/direction/eleves/${student.id}`} className="hover:underline">
                      <span className="font-semibold text-ink">{student.lastName}</span> {student.firstName}
                    </Link>
                  </th>
                  {grid.days.map((day) => {
                    const cell = dayCell(student.marks[day] ?? {});
                    const label = `${name}, ${formatDate(day, { weekday: "long", day: "numeric", month: "long" })} : ${describe(cell)}`;
                    return (
                      <td key={day} className="px-0.5 py-1.5 text-center">
                        <span
                          title={label}
                          aria-label={label}
                          role="img"
                          className={cn(
                            "inline-flex size-6 items-center justify-center rounded-md text-xs font-bold",
                            CELL[cell.kind].className,
                          )}
                        >
                          {CELL[cell.kind].letter}
                        </span>
                      </td>
                    );
                  })}
                  <td className="tabular px-3 py-1.5 text-right font-semibold text-ink">{student.absences || "—"}</td>
                  <td className="tabular px-3 py-1.5 text-right text-ink-soft">{student.lates || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
