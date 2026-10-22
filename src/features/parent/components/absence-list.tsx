import { getTranslations } from "next-intl/server";
import { StatusPill } from "@/components/dashboard/status-pill";
import { STATUS_TONE } from "@/features/justifications/components/justification-status";
import { coveringJustification } from "@/features/justifications/period";
import type { Justification } from "@/features/justifications/queries";
import { Link } from "@/i18n/navigation";
import { formatDate, formatTime } from "@/lib/format";
import type { ChildAbsence } from "../queries";

/**
 * Absences et retards d'un enfant : jour, créneau, classe et heure de l'appel.
 * Chaque absence indique son justificatif (accepté, en attente, refusé) ou propose d'en envoyer un.
 */
export async function AbsenceList({
  childId,
  absences,
  justifications,
  emptyLabel,
}: {
  childId: string;
  absences: ChildAbsence[];
  justifications: Pick<Justification, "from" | "to" | "status">[];
  emptyLabel: string;
}) {
  const t = await getTranslations("parentSpace");
  const tSlots = await getTranslations("attendance.slots");
  const tStatuses = await getTranslations("attendance.statuses");
  const tJustifications = await getTranslations("justifications.absenceState");
  if (absences.length === 0) return <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>;
  return (
    <ul className="mt-3 divide-y divide-line" aria-label={t("absencesLabel")}>
      {absences.map((absence, index) => {
        const justification = absence.status === "absent" ? coveringJustification(absence.date, justifications) : null;
        const day = formatDate(absence.date, { weekday: "long", day: "numeric", month: "long" });
        return (
          <li key={`${absence.date}-${absence.slot}-${index}`} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-ink first-letter:uppercase">
                {day}
                {absence.slot && <span className="text-ink-soft"> · {tSlots(absence.slot).toLowerCase()}</span>}
              </span>
              <span className="block text-xs text-muted-foreground">
                {absence.takenAt
                  ? t("rollCallAt", { className: absence.className, time: formatTime(absence.takenAt) })
                  : absence.className}
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <StatusPill tone={absence.status === "absent" ? "danger" : "warning"}>{tStatuses(absence.status)}</StatusPill>
              {justification && (
                <StatusPill tone={STATUS_TONE[justification.status]}>{tJustifications(justification.status)}</StatusPill>
              )}
              {absence.status === "absent" && (!justification || justification.status === "refused") && (
                <Link
                  href={`/parent/enfants/${childId}/justifier?du=${absence.date}`}
                  className="rounded-full px-2.5 py-1 text-xs font-semibold text-azure-700 ring-1 ring-azure-500/40 hover:bg-azure-50"
                  aria-label={t("justifyAbsence", { date: day })}
                >
                  {t("justify")}
                </Link>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
