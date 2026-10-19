import { ArrowLeft, Cake, HeartPulse, MapPin, Pencil, Phone, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { StatusPill } from "@/components/dashboard/status-pill";
import { PersonAvatar } from "@/components/people/person-avatar";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { getStudent } from "../queries";
import { StudentFormSheet } from "./student-form-sheet";

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
  const detail = await getStudent(entry.schoolId!, id);
  if (!detail) notFound();
  const { student, current, enrollments, guardians } = detail;
  const t = await getTranslations("students");
  const fullName = `${student.first_name} ${student.last_name}`;
  const canEdit = permissions.managePeople(entry.roles);

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
        <PersonAvatar name={fullName} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{fullName}</h1>
          <p className="tabular text-sm text-muted-foreground">{t("detail.matricule", { matricule: student.matricule })}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {current ? (
              <StatusPill tone="info">
                {t("detail.inClass", { className: current.className, year: current.yearLabel })}
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
        <section className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
          <h2 className="text-lg font-semibold">{t("detail.guardians")}</h2>
          {guardians.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("detail.noGuardians")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {guardians.map((guardian) => (
                <li key={guardian.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <PersonAvatar name={guardian.full_name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-semibold">
                      {guardian.full_name}
                      {guardian.isPrimary && (
                        <Star className="size-3.5 fill-sun-300 text-sun-400" aria-label={t("detail.primary")} />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(`relationships.${guardian.relationship}`)}
                      {guardian.profession && ` · ${guardian.profession}`}
                    </p>
                  </div>
                  {guardian.phone && (
                    <a
                      href={`tel:${guardian.phone}`}
                      className="tabular inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
                    >
                      <Phone className="size-4" aria-hidden />
                      {formatPhone(guardian.phone)}
                    </a>
                  )}
                  {guardian.user_id ? (
                    <StatusPill tone="success">{t("detail.parentConnected")}</StatusPill>
                  ) : guardian.phone ? (
                    <StatusPill tone="warning">{t("detail.parentInvited")}</StatusPill>
                  ) : (
                    <StatusPill tone="neutral">{t("detail.parentNoPhone")}</StatusPill>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 rounded-lg bg-azure-50 px-3 py-2 text-xs text-ink-soft">{t("detail.parentAccessHint")}</p>
        </section>

        <div className="space-y-6">
          <section className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
            <h2 className="text-lg font-semibold">{t("detail.history")}</h2>
            <ol className="mt-4 space-y-3">
              {enrollments.map((enrollment) => (
                <li key={enrollment.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    <span className="font-semibold">{enrollment.yearLabel}</span> · {enrollment.className}
                    <span className="block text-xs text-muted-foreground">
                      {t("detail.enrolledOn", { date: formatDate(enrollment.enrolledOn) })}
                    </span>
                  </span>
                  <StatusPill tone={enrollment.status === "active" ? "success" : "neutral"}>
                    {t(`enrollmentStatus.${enrollment.status}`)}
                  </StatusPill>
                </li>
              ))}
            </ol>
          </section>

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
