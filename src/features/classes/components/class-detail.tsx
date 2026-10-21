import { ArrowLeft, DoorOpen, Pencil, Plus, UserRound, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { StatusPill } from "@/components/dashboard/status-pill";
import { PersonAvatar } from "@/components/people/person-avatar";
import { Button } from "@/components/ui/button";
import { StudentFormSheet } from "@/features/students/components/student-form-sheet";
import { listClassOptions } from "@/features/students/queries";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { getClass } from "../queries";
import { ClassFormSheet } from "./class-form-sheet";
import { ClassTeaching, ClassTitular } from "./class-teaching";

/** Fiche classe (données de requête : sous <Suspense>). */
export async function ClassDetailView({ id }: { id: string }) {
  const { entry } = await requireSpace("direction");
  const canManageAcademics = permissions.manageAcademics(entry.roles);
  const canManagePeople = permissions.managePeople(entry.roles);
  const [detail, options] = await Promise.all([
    getClass(entry.schoolId!, id),
    canManagePeople ? listClassOptions(entry.schoolId!) : Promise.resolve({ yearLabel: null, classes: [] }),
  ]);
  if (!detail) notFound();
  const { klass, students, girls, boys, subjects, teachers } = detail;
  const t = await getTranslations("classes");
  const tStudents = await getTranslations("students");
  const canRegister = canManagePeople && klass.isCurrent && options.classes.some((c) => c.id === klass.id);

  return (
    <>
      <Link
        href="/direction/classes"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("detail.back")}
      </Link>

      <section className="mt-4 mb-6 flex flex-col gap-5 rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70 sm:flex-row sm:items-center">
        <div
          className="grid size-16 shrink-0 place-items-center rounded-2xl bg-lavender-200 text-xl font-bold text-ink"
          aria-hidden
        >
          {klass.name.slice(0, 3)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{klass.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[klass.cycleLabel, klass.levelLabel, klass.yearLabel].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" aria-hidden />
              {klass.capacity
                ? t("detail.headcountOf", { count: students.length, capacity: klass.capacity })
                : t("detail.headcount", { count: students.length })}
              {" · "}
              {t("list.genders", { girls, boys })}
            </span>
            {klass.room && (
              <span className="inline-flex items-center gap-1.5">
                <DoorOpen className="size-4" aria-hidden />
                {klass.room}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="size-4" aria-hidden />
              {klass.homeroomName
                ? t(klass.hasClassTeacher ? "detail.titular" : "detail.homeroom", { name: klass.homeroomName })
                : t(klass.hasClassTeacher ? "list.noTitular" : "list.noHomeroom")}
            </span>
          </div>
        </div>
        {canManageAcademics && (
          <ClassFormSheet
            klass={klass}
            titularMode={klass.hasClassTeacher}
            teachers={teachers}
            trigger={
              <Button variant="outline">
                <Pencil aria-hidden />
                {t("detail.edit")}
              </Button>
            }
          />
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t("detail.students")}</h2>
            {canRegister && (
              <StudentFormSheet
                classes={options.classes}
                defaultClassId={klass.id}
                trigger={
                  <Button variant="sun" size="sm">
                    <Plus aria-hidden />
                    {tStudents("list.register")}
                  </Button>
                }
              />
            )}
          </div>
          {students.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("detail.noStudents")}</p>
          ) : (
            <ol className="mt-4 divide-y divide-line">
              {students.map((student, index) => (
                <li key={student.id}>
                  <Link
                    href={`/direction/eleves/${student.id}`}
                    className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-azure-50/60"
                  >
                    <span className="tabular w-6 text-right text-xs text-muted-foreground">{index + 1}</span>
                    <PersonAvatar name={student.fullName} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">
                        {student.lastName.toLocaleUpperCase("fr")} {student.firstName}
                      </span>
                      <span className="tabular block truncate text-xs text-muted-foreground">
                        {student.matricule}
                        {student.birthDate && ` · ${formatDate(student.birthDate)}`}
                      </span>
                    </span>
                    <StatusPill tone={student.sex === "F" ? "lavender" : "info"}>{tStudents(`sex.${student.sex}`)}</StatusPill>
                    {student.guardianPhone && (
                      <span className="tabular hidden text-sm text-ink-soft md:inline">{formatPhone(student.guardianPhone)}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
          {klass.hasClassTeacher ? (
            <>
              <h2 className="text-lg font-semibold">{t("teaching.titularTitle")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{t("teaching.titularHint")}</p>
              <ClassTitular
                classId={klass.id}
                titularId={klass.homeroomStaffId}
                titularName={klass.homeroomName}
                teachers={teachers}
                canEdit={canManageAcademics}
              />
              <h3 className="mt-6 text-sm font-semibold">{t("teaching.exceptionsTitle")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("teaching.exceptionsHint")}</p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">{t("teaching.title")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{t("teaching.hint")}</p>
            </>
          )}
          <ClassTeaching
            classId={klass.id}
            subjects={subjects}
            teachers={teachers}
            canEdit={canManageAcademics}
            titularName={klass.hasClassTeacher ? klass.homeroomName : undefined}
          />
        </section>
      </div>
    </>
  );
}

export function ClassDetailSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="h-4 w-40 animate-pulse rounded-full bg-line" />
      <div className="h-40 animate-pulse rounded-xl bg-white shadow-card" />
      <div className="h-64 animate-pulse rounded-xl bg-white shadow-card" />
    </div>
  );
}
