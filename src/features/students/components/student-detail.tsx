import { ArrowLeft, Cake, HeartPulse, MapPin, Pencil } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { StatusPill } from "@/components/dashboard/status-pill";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { StudentBadge } from "@/features/arrivals/components/student-badge";
import { StudentFees } from "@/features/fees/components/student-fees";
import { getStudentFees } from "@/features/fees/queries";
import { StudentInvoices } from "@/features/invoices/components/student-invoices";
import { listStudentInvoices } from "@/features/invoices/queries";
import { listStudentPayments } from "@/features/payments/queries";
import { todayInDakar } from "@/features/dashboard/calendar";
import { ReportList } from "@/features/reports/components/report-list";
import { listStudentReports } from "@/features/reports/queries";
import { getStudent, listClassOptions } from "../queries";
import { EnrollmentActions } from "./enrollment-actions";
import { GuardiansManager } from "./guardians-manager";
import { StudentDocuments } from "./student-documents";
import { StudentFormSheet } from "./student-form-sheet";
import { StudentPhoto } from "./student-photo";

/** Âge révolu à partir d'une date « AAAA-MM-JJ ». */
function age(birthDate: string) {
  const [y, m, d] = birthDate.split("-").map(Number) as [number, number, number];
  const now = new Date();
  let years = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) years -= 1;
  return years;
}

/** Fiche élève (données de requête : sous <Suspense>). */
export async function StudentDetailView({ id }: { id: string }) {
  const { entry } = await requireSpace("direction");
  const canEdit = permissions.managePeople(entry.roles);
  // Chaque bloc ne paraît qu'aux rôles qui lisent ces données (règles de la base, migration role_scoped_reads).
  const canSeeReports = permissions.readAttendance(entry.roles);
  const canSeeFinance = permissions.manageFinance(entry.roles);
  const [detail, options, reports] = await Promise.all([
    getStudent(entry.schoolId!, id),
    canEdit ? listClassOptions(entry.schoolId!) : Promise.resolve({ yearLabel: null, classes: [] }),
    canSeeReports ? listStudentReports(id) : [],
  ]);
  if (!detail) notFound();
  const { student, photoUrl, documents, current, enrollments, guardians } = detail;
  const [fees, invoices, payments] = await Promise.all([
    canSeeFinance && current?.status === "active" ? getStudentFees(entry.schoolId!, student.id, current.classId) : null,
    canSeeFinance ? listStudentInvoices(student.id, todayInDakar()) : [],
    canSeeFinance ? listStudentPayments(student.id) : [],
  ]);
  const t = await getTranslations("students");
  const tReports = await getTranslations("reports");
  const fullName = `${student.first_name} ${student.last_name}`;

  return (
    <>
      <Link
        href="/direction/eleves"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("detail.back")}
      </Link>

      <section className="mt-4 mb-6 flex flex-col gap-5 rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70 sm:flex-row sm:items-center">
        <StudentPhoto schoolId={entry.schoolId!} studentId={student.id} name={fullName} photoUrl={photoUrl} canEdit={canEdit} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{fullName}</h1>
          <p className="tabular text-sm text-muted-foreground">{t("detail.matricule", { matricule: student.matricule })}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {current?.status === "active" ? (
              <StatusPill tone="info">
                {t("detail.inClass", { className: current.className, year: current.yearLabel })}
              </StatusPill>
            ) : current ? (
              <StatusPill tone="warning">
                {t("detail.departed", {
                  status: t(`enrollmentStatus.${current.status}`),
                  date: current.leftOn ? formatDate(current.leftOn) : "—",
                })}
              </StatusPill>
            ) : (
              <StatusPill tone="warning">{t("detail.notEnrolled")}</StatusPill>
            )}
            <StatusPill tone="lavender">{t(`sex.${student.sex}`)}</StatusPill>
            {student.status === "inactive" && <StatusPill tone="neutral">{t("detail.inactive")}</StatusPill>}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
            {student.birth_date && (
              <span className="inline-flex items-center gap-1.5">
                <Cake className="size-4" aria-hidden />
                {t("detail.born", { date: formatDate(student.birth_date), age: age(student.birth_date) })}
                {student.birth_place && ` ${t("detail.bornAt", { place: student.birth_place })}`}
              </span>
            )}
            {student.address && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden />
                {student.address}
              </span>
            )}
          </div>
        </div>
        {canEdit && (
          <StudentFormSheet
            student={{
              id: student.id,
              firstName: student.first_name,
              lastName: student.last_name,
              sex: student.sex,
              birthDate: student.birth_date,
              birthPlace: student.birth_place,
              nationality: student.nationality,
              address: student.address,
              medicalNotes: student.medical_notes,
            }}
            trigger={
              <Button variant="outline">
                <Pencil aria-hidden />
                {t("detail.edit")}
              </Button>
            }
          />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
            <GuardiansManager studentId={student.id} guardians={guardians} canEdit={canEdit} />
          </section>
          <section className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
            <StudentDocuments schoolId={entry.schoolId!} studentId={student.id} documents={documents} canEdit={canEdit} />
          </section>
          {canSeeReports && (
            <section className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70" aria-labelledby="student-reports">
              <h2 id="student-reports" className="text-lg font-semibold">
                {tReports("studentTitle")}
              </h2>
              <ReportList reports={reports} emptyLabel={tReports("studentEmpty")} />
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
            <h2 className="text-lg font-semibold">{t("detail.history")}</h2>
            {canEdit && (
              <div className="mt-3">
                <EnrollmentActions
                  studentId={student.id}
                  current={current ? { classId: current.classId, status: current.status } : null}
                  yearLabel={options.yearLabel}
                  classes={options.classes}
                />
              </div>
            )}
            <ol className="mt-4 space-y-3">
              {enrollments.map((enrollment) => (
                <li key={enrollment.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    <span className="font-semibold">{enrollment.yearLabel}</span> · {enrollment.className}
                    <span className="block text-xs text-muted-foreground">
                      {t("detail.enrolledOn", { date: formatDate(enrollment.enrolledOn) })}
                      {enrollment.leftOn && ` · ${t("detail.leftOn", { date: formatDate(enrollment.leftOn) })}`}
                    </span>
                  </span>
                  <StatusPill tone={enrollment.status === "active" ? "success" : "neutral"}>
                    {t(`enrollmentStatus.${enrollment.status}`)}
                  </StatusPill>
                </li>
              ))}
            </ol>
          </section>

          {fees && <StudentFees studentId={student.id} data={fees} canEdit={permissions.manageFinance(entry.roles)} />}
          {canSeeFinance && (
            <StudentInvoices
              studentId={student.id}
              invoices={invoices}
              payments={payments}
              canCollect={permissions.manageFinance(entry.roles)}
            />
          )}

          <StudentBadge studentId={student.id} name={fullName} canRenew={canEdit} />

          {(student.medical_notes || student.nationality) && (
            <section className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
              <h2 className="text-lg font-semibold">{t("detail.more")}</h2>
              <dl className="mt-3 space-y-3 text-sm">
                {student.nationality && (
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("form.nationality")}</dt>
                    <dd>{student.nationality}</dd>
                  </div>
                )}
                {student.medical_notes && (
                  <div>
                    <dt className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <HeartPulse className="size-3.5" aria-hidden />
                      {t("form.medicalNotes")}
                    </dt>
                    <dd className="whitespace-pre-line">{student.medical_notes}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

export function StudentDetailSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="h-4 w-40 animate-pulse rounded-full bg-line" />
      <div className="h-40 animate-pulse rounded-xl bg-white shadow-card" />
      <div className="h-64 animate-pulse rounded-xl bg-white shadow-card" />
    </div>
  );
}
