import { ChevronRight, ClipboardCheck, FileCheck, PartyPopper, Phone, ScanQrCode } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { EmptyState } from "@/components/layout/empty-state";
import { PersonAvatar } from "@/components/people/person-avatar";
import { buttonVariants } from "@/components/ui/button";
import { listArrivals } from "@/features/arrivals/queries";
import { countPendingJustifications } from "@/features/justifications/queries";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { formatDate, formatTime } from "@/lib/format";
import { ATTENDANCE_SLOTS, type AttendanceStatus } from "@/lib/offline/operations";
import { formatPhone } from "@/lib/phone";
import {
  getDailyAttendance,
  getRepeatedAbsences,
  REPEATED_ABSENCE_THRESHOLD,
  REPEATED_ABSENCE_WINDOW_DAYS,
  type SlotState,
} from "../direction-queries";
import { attendanceRate } from "../report";

const card = "rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6";

async function MarkPill({ status }: { status: AttendanceStatus | undefined }) {
  const t = await getTranslations("attendance.statuses");
  if (!status) return <span className="text-sm text-muted-foreground">—</span>;
  const tone = status === "absent" ? "danger" : status === "late" ? "warning" : "success";
  return <StatusPill tone={tone}>{t(status)}</StatusPill>;
}

async function SlotSummary({
  state,
  classId,
  canTake,
  date,
}: {
  state: SlotState;
  classId: string;
  canTake: boolean;
  date: string;
}) {
  const t = await getTranslations("attendance.direction");
  if (!state) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone="neutral">{t("notTaken")}</StatusPill>
        {canTake && (
          <Link href={`/direction/presences/appel/${classId}`} className="text-sm font-semibold text-azure-700 hover:underline">
            {t("takeRollCall")}
          </Link>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <p className="text-sm text-ink">
        {formatTime(state.takenAt)}
        {state.takenBy && <span className="text-muted-foreground"> · {state.takenBy}</span>}
        {" · "}
        <Link
          href={`/direction/presences/historique?date=${date}&classe=${classId}`}
          className="font-semibold text-azure-700 hover:underline"
        >
          {t("history")}
        </Link>
      </p>
      {state.absent + state.late > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {state.absent > 0 && <StatusPill tone="danger">{t("absentCount", { count: state.absent })}</StatusPill>}
          {state.late > 0 && <StatusPill tone="warning">{t("lateCount", { count: state.late })}</StatusPill>}
        </div>
      ) : (
        <StatusPill tone="success">{t("allPresent")}</StatusPill>
      )}
    </div>
  );
}

/** Journée de présence vue par la direction (données de requête : sous <Suspense>). */
export async function DailyOverview({ date, today }: { date: string; today: string }) {
  const { entry } = await requireSpace("direction");
  const canTake = permissions.takeAttendance(entry.roles) && date === today;
  const canReview = permissions.reviewAbsences(entry.roles);
  const [day, repeated, pendingJustifications, arrivals, t, tSlots, tArrivals] = await Promise.all([
    getDailyAttendance(entry.schoolId!, date),
    getRepeatedAbsences(entry.schoolId!, today),
    canReview ? countPendingJustifications(entry.schoolId!) : 0,
    listArrivals({ schoolId: entry.schoolId! }, date),
    getTranslations("attendance.direction"),
    getTranslations("attendance.slots"),
    getTranslations("arrivals"),
  ]);
  const { totals } = day;
  const rate = attendanceRate(totals.marks, totals.absentMarks);

  if (totals.classCount === 0) {
    return <EmptyState icon={ClipboardCheck} title={t("noClasses")} body={t("noClassesHint")} />;
  }

  return (
    <div className="space-y-6">
      {pendingJustifications > 0 && (
        <Link
          href="/direction/presences/justificatifs"
          className="flex items-center gap-3 rounded-xl bg-azure-50 px-4 py-3 text-sm font-semibold text-ink ring-1 ring-azure-500/30 hover:bg-azure-100"
        >
          <FileCheck className="size-5 shrink-0 text-azure-700" aria-hidden />
          <span className="flex-1">{t("pendingJustifications", { count: pendingJustifications })}</span>
          <ChevronRight className="size-4 text-ink-soft" aria-hidden />
        </Link>
      )}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label={t("rate")} value={rate === null ? null : `${rate} %`} tone="azure" />
        <KpiCard label={t("absentStudents")} value={totals.absentStudents} tone="lavender" />
        <KpiCard label={t("lateStudents")} value={totals.lateStudents} tone="sun" />
        <KpiCard label={t("classesWithoutRollCall")} value={totals.classesWithoutRollCall} tone="white" />
      </div>

      {arrivals.size > 0 && (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <ScanQrCode className="size-4 text-azure-700" aria-hidden />
          {tArrivals("todayArrivals", { count: arrivals.size })}
        </p>
      )}

      <section className={card} aria-labelledby="presence-classes">
        <h2 id="presence-classes" className="text-lg font-semibold">
          {t("classesTitle")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("classesHint")}</p>
        <div className="mt-4 hidden md:block">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-semibold text-ink-soft">
              <tr className="border-b border-line">
                <th scope="col" className="py-3 pr-4">
                  {t("class")}
                </th>
                {ATTENDANCE_SLOTS.map((slot) => (
                  <th key={slot} scope="col" className="py-3 pr-4">
                    {tSlots(slot)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {day.classes.map((klass) => (
                <tr key={klass.id}>
                  <th scope="row" className="py-3 pr-4 align-top font-normal">
                    <span className="block font-semibold text-ink">{klass.name}</span>
                    <span className="block text-xs text-muted-foreground">{t("students", { count: klass.studentCount })}</span>
                  </th>
                  {ATTENDANCE_SLOTS.map((slot) => (
                    <td key={slot} className="py-3 pr-4 align-top">
                      <SlotSummary state={klass.slots[slot]} classId={klass.id} canTake={canTake} date={date} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Téléphone : une carte par classe, matin et après-midi l'un sous l'autre. */}
        <ul className="mt-4 divide-y divide-line md:hidden">
          {day.classes.map((klass) => (
            <li key={klass.id} aria-label={klass.name} className="space-y-2 py-3">
              <p>
                <span className="font-semibold text-ink">{klass.name}</span>{" "}
                <span className="text-xs text-muted-foreground">· {t("students", { count: klass.studentCount })}</span>
              </p>
              {ATTENDANCE_SLOTS.map((slot) => (
                <div key={slot} className="flex gap-3">
                  <span className="w-24 shrink-0 pt-0.5 text-xs font-semibold text-ink-soft">{tSlots(slot)}</span>
                  <SlotSummary state={klass.slots[slot]} classId={klass.id} canTake={canTake} date={date} />
                </div>
              ))}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className={card} aria-labelledby="presence-absents">
          <h2 id="presence-absents" className="text-lg font-semibold">
            {t("absentsTitle", { date: formatDate(date, { weekday: "long", day: "numeric", month: "long" }) })}
          </h2>
          {day.students.length === 0 ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <PartyPopper className="size-4" aria-hidden />
              {totals.marks === 0 ? t("noRollCallYet") : t("noAbsents")}
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {day.students.map((student) => {
                const name = `${student.firstName} ${student.lastName}`;
                return (
                  <li key={student.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <Link
                      href={`/direction/eleves/${student.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3 hover:underline"
                    >
                      <PersonAvatar name={name} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{name}</span>
                        <span className="block text-xs text-muted-foreground">{student.className}</span>
                      </span>
                    </Link>
                    <span className="flex w-full gap-3 pl-11 text-xs text-muted-foreground sm:w-auto sm:pl-0">
                      {ATTENDANCE_SLOTS.map((slot) => (
                        <span key={slot} className="flex items-center gap-1.5">
                          {tSlots(slot)} <MarkPill status={student.marks[slot]} />
                        </span>
                      ))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={card} aria-labelledby="presence-repeated">
          <h2 id="presence-repeated" className="text-lg font-semibold">
            {t("repeatedTitle")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("repeatedHint", { threshold: REPEATED_ABSENCE_THRESHOLD, days: REPEATED_ABSENCE_WINDOW_DAYS })}
          </p>
          {repeated.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("noRepeated")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {repeated.map((row) => (
                <li key={row.studentId} className="flex flex-wrap items-center gap-3 py-2.5">
                  <Link
                    href={`/direction/eleves/${row.studentId}`}
                    className="flex min-w-0 flex-1 items-center gap-3 hover:underline"
                  >
                    <PersonAvatar name={row.name} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{row.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[
                          row.className,
                          row.lastAbsence &&
                            t("lastAbsence", { date: formatDate(row.lastAbsence, { day: "numeric", month: "long" }) }),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </Link>
                  <StatusPill tone="danger">{t("halfDays", { count: row.absences })}</StatusPill>
                  {row.justified > 0 && <StatusPill tone="success">{t("justifiedCount", { count: row.justified })}</StatusPill>}
                  {row.lates > 0 && <StatusPill tone="warning">{t("lateCount", { count: row.lates })}</StatusPill>}
                  {row.guardian?.phone && (
                    <a
                      href={`tel:${row.guardian.phone}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                      aria-label={t("callGuardian", { name: row.guardian.name })}
                    >
                      <Phone aria-hidden />
                      <span className="tabular">{formatPhone(row.guardian.phone)}</span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export function DailyOverviewSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-xl bg-white shadow-card" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-white shadow-card" />
    </div>
  );
}
