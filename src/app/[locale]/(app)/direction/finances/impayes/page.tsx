import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarX2, CircleCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PersonAvatar } from "@/components/people/person-avatar";
import { ReminderActions } from "@/features/collections/components/reminder-actions";
import { ReportCardBlockSetting } from "@/features/collections/components/report-card-block-setting";
import { getUnpaidPolicy, withFamilies } from "@/features/collections/queries";
import { todayInDakar } from "@/features/dashboard/calendar";
import { getFeeSchedule } from "@/features/fees/queries";
import { listInvoices } from "@/features/invoices/queries";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { overdueByStudent } from "@/lib/domain/collections";
import { formatDate, formatXOF } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("overdue") };
}

/** Familles en retard de paiement (factures échues non soldées), relances et réglage des bulletins. */
async function Overdue() {
  const [{ entry }, t] = await Promise.all([requireSpace("direction"), getTranslations("collections")]);
  const schoolId = entry.schoolId!;
  const [schedule, policy] = await Promise.all([getFeeSchedule(schoolId), getUnpaidPolicy(schoolId)]);
  const setting = <ReportCardBlockSetting enabled={policy.blockReportCards} canEdit={permissions.manageSchool(entry.roles)} />;
  if (!schedule) return <EmptyState icon={CalendarX2} title={t("noYear")} body={t("noYearHint")} />;

  const today = todayInDakar();
  const invoices = await listInvoices(schoolId, schedule.year.id, null, today);
  const families = await withFamilies(schoolId, overdueByStudent(invoices, today));
  const canRemind = permissions.manageFinance(entry.roles);
  const total = families.reduce((sum, family) => sum + family.overdue, 0);

  return (
    <div className="space-y-6">
      {setting}
      {families.length === 0 ? (
        <EmptyState icon={CircleCheck} title={t("noOverdue")} body={t("noOverdueHint")} />
      ) : (
        <section aria-labelledby="overdue-list" className="rounded-xl bg-white shadow-card ring-1 ring-line/70">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
            <h2 id="overdue-list" className="text-lg font-semibold">
              {t("overdueCount", { count: families.length })}
            </h2>
            <p className="text-sm font-semibold text-danger-700">{t("overdueTotal", { amount: formatXOF(total) })}</p>
          </div>
          <ul className="divide-y divide-line" aria-label={t("overdueListLabel")}>
            {families.map((family) => (
              <li key={family.studentId} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <PersonAvatar name={family.studentName} />
                  <div className="min-w-0">
                    <Link href={`/direction/eleves/${family.studentId}`} className="font-semibold hover:text-azure-700">
                      {family.studentName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {[family.className, family.guardianName, family.guardianPhone].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
                <div className="min-w-0 lg:w-56">
                  <p className="tabular font-semibold text-danger-700">{formatXOF(family.overdue)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("lateSince", {
                      date: formatDate(family.oldestDueOn, { day: "numeric", month: "long" }),
                      days: family.daysLate,
                      count: family.invoiceCount,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {family.lastReminder
                      ? t("lastReminder", {
                          channel: t(`reminders.channels.${family.lastReminder.channel}`),
                          date: formatDate(family.lastReminder.sentAt, { day: "numeric", month: "short" }),
                        })
                      : t("neverReminded")}
                  </p>
                </div>
                {canRemind && (
                  <ReminderActions
                    studentId={family.studentId}
                    studentName={family.studentName}
                    overdue={family.overdue}
                    phone={family.guardianPhone}
                    message={t("reminders.message", {
                      guardian: family.guardianName ?? "",
                      school: policy.schoolName,
                      student: family.firstName,
                      amount: formatXOF(family.overdue),
                      date: formatDate(family.oldestDueOn, { day: "numeric", month: "long" }),
                    })}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default async function OverduePage() {
  const t = await getTranslations("collections");
  return (
    <>
      <PageHeader title={t("overdueTitle")} description={t("overdueDescription")} />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Overdue />
      </Suspense>
    </>
  );
}
