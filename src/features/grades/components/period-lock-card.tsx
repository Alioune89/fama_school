import { CircleAlert, Lock, LockOpen } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import type { PeriodLockStatus } from "../council-queries";
import { PeriodLockButton } from "./period-lock-button";

const SHOWN = 5;

/**
 * Verrouillage d'une période pour toute l'école : état, évaluations encore incomplètes,
 * et bouton pour verrouiller (direction pédagogique) ou déverrouiller (fondateur, directeur).
 */
export async function PeriodLockCard({
  status,
  canLock,
  canUnlock,
}: {
  status: PeriodLockStatus;
  canLock: boolean;
  canUnlock: boolean;
}) {
  const t = await getTranslations("grades.lock");
  const locked = status.lockedAt !== null;

  return (
    <section
      aria-labelledby="period-lock"
      className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70 sm:p-5 lg:flex-row lg:items-start lg:justify-between"
    >
      <div className="min-w-0 space-y-2">
        <h2 id="period-lock" className="flex items-center gap-2 font-semibold text-ink">
          {locked ? (
            <Lock className="size-4 text-ink-soft" aria-hidden />
          ) : (
            <LockOpen className="size-4 text-success-700" aria-hidden />
          )}
          {locked
            ? t("lockedTitle", {
                label: status.periodLabel,
                date: formatDate(status.lockedAt!, { day: "numeric", month: "long" }),
              })
            : t("openTitle", { label: status.periodLabel })}
        </h2>
        <p className="text-sm text-muted-foreground">{locked ? t("lockedHint") : t("openHint")}</p>
        {!locked && status.incomplete.length > 0 && (
          <div className="rounded-lg bg-warning-50 p-3 text-sm">
            <p className="flex items-start gap-2 font-medium text-warning-700">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t("incomplete", { count: status.incomplete.length })}
            </p>
            <ul className="mt-1.5 space-y-1 pl-6">
              {status.incomplete.slice(0, SHOWN).map((evaluation) => (
                <li key={evaluation.id}>
                  <Link href={`/direction/notes/${evaluation.id}`} className="text-ink hover:underline">
                    {evaluation.className} · {evaluation.subjectName} · {evaluation.title}
                  </Link>{" "}
                  <span className="text-muted-foreground">{t("missing", { count: evaluation.missing })}</span>
                </li>
              ))}
              {status.incomplete.length > SHOWN && (
                <li className="text-muted-foreground">{t("more", { count: status.incomplete.length - SHOWN })}</li>
              )}
            </ul>
          </div>
        )}
      </div>
      {(locked ? canUnlock : canLock) && (
        <PeriodLockButton periodId={status.periodId} label={status.periodLabel} locked={locked} />
      )}
    </section>
  );
}
