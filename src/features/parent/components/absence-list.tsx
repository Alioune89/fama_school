import { getTranslations } from "next-intl/server";
import { StatusPill } from "@/components/dashboard/status-pill";
import { formatDate, formatTime } from "@/lib/format";
import type { ChildAbsence } from "../queries";

/** Absences et retards d'un enfant : jour, créneau, classe et heure de l'appel. */
export async function AbsenceList({ absences, emptyLabel }: { absences: ChildAbsence[]; emptyLabel: string }) {
  const t = await getTranslations("parentSpace");
  const tSlots = await getTranslations("attendance.slots");
  const tStatuses = await getTranslations("attendance.statuses");
  if (absences.length === 0) return <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>;
  return (
    <ul className="mt-3 divide-y divide-line" aria-label={t("absencesLabel")}>
      {absences.map((absence, index) => (
        <li key={`${absence.date}-${absence.slot}-${index}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-ink first-letter:uppercase">
              {formatDate(absence.date, { weekday: "long", day: "numeric", month: "long" })}
              {absence.slot && <span className="text-ink-soft"> · {tSlots(absence.slot).toLowerCase()}</span>}
            </span>
            <span className="block text-xs text-muted-foreground">
              {absence.takenAt
                ? t("rollCallAt", { className: absence.className, time: formatTime(absence.takenAt) })
                : absence.className}
            </span>
          </span>
          <StatusPill tone={absence.status === "absent" ? "danger" : "warning"}>{tStatuses(absence.status)}</StatusPill>
        </li>
      ))}
    </ul>
  );
}
