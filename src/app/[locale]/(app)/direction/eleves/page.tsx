import { Suspense } from "react";
import type { Metadata } from "next";
import { ChevronRight, ClipboardPen, FileUp, Plus, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { FilterSelect } from "@/components/data/filter-select";
import { SearchInput } from "@/components/data/search-input";
import { StatusPill } from "@/components/dashboard/status-pill";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PersonAvatar } from "@/components/people/person-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { countPendingPreregistrations } from "@/features/preregistrations/queries";
import { StudentFormSheet } from "@/features/students/components/student-form-sheet";
import { listClassOptions, listStudents } from "@/features/students/queries";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";

type SearchParams = PageProps<"/[locale]/direction/eleves">["searchParams"];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("students") };
}

async function HeaderActions() {
  const { entry } = await requireSpace("direction");
  if (!permissions.managePeople(entry.roles)) return null;
  const [{ classes }, pending, t] = await Promise.all([
    listClassOptions(entry.schoolId!),
    countPendingPreregistrations(entry.schoolId!),
    getTranslations("students"),
  ]);
  const preregistrations = (
    <Link href="/direction/eleves/preinscriptions" className={buttonVariants({ variant: "outline" })}>
      <ClipboardPen aria-hidden />
      {t("list.preregistrations")}
      {pending > 0 && (
        <span className="rounded-full bg-sun-300 px-2 py-0.5 text-xs font-bold text-ink tabular-nums">
          <span className="sr-only">{t("list.pendingPreregistrations", { count: pending })}</span>
          <span aria-hidden>{pending}</span>
        </span>
      )}
    </Link>
  );
  if (classes.length === 0) return preregistrations;
  return (
    <>
      {preregistrations}
      <Link href="/direction/eleves/importer" className={buttonVariants({ variant: "outline" })}>
        <FileUp aria-hidden />
        {t("list.import")}
      </Link>
      <StudentFormSheet
        classes={classes}
        trigger={
          <Button variant="sun">
            <Plus aria-hidden />
            {t("list.register")}
          </Button>
        }
      />
    </>
  );
}

async function ClassFilter() {
  const { entry } = await requireSpace("direction");
  const [{ classes }, t] = await Promise.all([listClassOptions(entry.schoolId!), getTranslations("students")]);
  return (
    <FilterSelect
      param="classe"
      label={t("list.class")}
      allLabel={t("list.allClasses")}
      options={classes.map((c) => ({ value: c.id, label: t("list.classWithCount", { name: c.name, count: c.count }) }))}
    />
  );
}

async function StudentsList({ searchParams }: { searchParams: SearchParams }) {
  const { entry } = await requireSpace("direction");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const classId = typeof params.classe === "string" && /^[0-9a-f-]{36}$/i.test(params.classe) ? params.classe : null;
  const [{ hasYear, students }, { classes }, t] = await Promise.all([
    listStudents(entry.schoolId!, { q, classId }),
    listClassOptions(entry.schoolId!),
    getTranslations("students"),
  ]);

  if (!hasYear || classes.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t("list.setupFirst")}
        body={t("list.setupFirstHint")}
        action={
          <Link href="/direction/parametres" className={buttonVariants()}>
            {t("list.goToSettings")}
          </Link>
        }
      />
    );
  }

  if (students.length === 0) {
    const filtered = Boolean(q || classId);
    return (
      <EmptyState
        icon={Users}
        title={filtered ? t("list.noResults") : t("list.empty")}
        body={filtered ? undefined : t("list.emptyHint")}
        action={
          filtered || !permissions.managePeople(entry.roles) ? undefined : (
            <Link href="/direction/eleves/importer" className={buttonVariants({ variant: "outline" })}>
              <FileUp aria-hidden />
              {t("list.import")}
            </Link>
          )
        }
      />
    );
  }

  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">{t("list.count", { count: students.length })}</p>

      <div className="hidden overflow-hidden rounded-xl bg-white shadow-card ring-1 ring-line/70 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-azure-50 text-xs font-semibold text-ink-soft">
            <tr>
              <th scope="col" className="px-5 py-4">
                {t("list.student")}
              </th>
              <th scope="col" className="px-5 py-4">
                {t("list.class")}
              </th>
              <th scope="col" className="px-5 py-4">
                {t("list.sex")}
              </th>
              <th scope="col" className="px-5 py-4">
                {t("list.birthDate")}
              </th>
              <th scope="col" className="px-5 py-4">
                {t("list.guardian")}
              </th>
              <th scope="col" className="w-10 px-3 py-4">
                <span className="sr-only">{t("list.open")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {students.map((student) => (
              <tr key={student.id} className="group relative transition-colors hover:bg-azure-50/60">
                <td className="px-5 py-3.5">
                  <Link href={`/direction/eleves/${student.id}`} className="flex items-center gap-3 after:absolute after:inset-0">
                    <PersonAvatar name={student.fullName} />
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{student.fullName}</span>
                      <span className="tabular block truncate text-xs text-muted-foreground">{student.matricule}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-5 py-3.5">
                  <span className="flex flex-wrap gap-1.5">
                    {student.className ? <StatusPill tone="info">{student.className}</StatusPill> : "—"}
                    {student.enrollmentStatus && student.enrollmentStatus !== "active" && (
                      <StatusPill tone="warning">{t(`enrollmentStatus.${student.enrollmentStatus}`)}</StatusPill>
                    )}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-ink-soft">{t(`sex.${student.sex}`)}</td>
                <td className="tabular px-5 py-3.5 whitespace-nowrap text-ink-soft">
                  {student.birthDate ? formatDate(student.birthDate) : "—"}
                </td>
                <td className="px-5 py-3.5 text-ink-soft">
                  {student.guardianName ? (
                    <>
                      <span className="block">{student.guardianName}</span>
                      <span className="tabular block text-xs text-muted-foreground">
                        {formatPhone(student.guardianPhone) || "—"}
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-3.5 text-muted-foreground">
                  <ChevronRight className="size-4" aria-hidden />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-3 md:hidden">
        {students.map((student) => (
          <li key={student.id}>
            <Link
              href={`/direction/eleves/${student.id}`}
              className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70"
            >
              <PersonAvatar name={student.fullName} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{student.fullName}</span>
                <span className="block text-sm text-muted-foreground">
                  {student.guardianName
                    ? `${student.guardianName} · ${formatPhone(student.guardianPhone) || "—"}`
                    : student.matricule}
                </span>
                {student.className && (
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    <StatusPill tone="info">{student.className}</StatusPill>
                    {student.enrollmentStatus && student.enrollmentStatus !== "active" && (
                      <StatusPill tone="warning">{t(`enrollmentStatus.${student.enrollmentStatus}`)}</StatusPill>
                    )}
                  </span>
                )}
              </span>
              <ChevronRight className="mt-1 size-4 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default async function StudentsPage({ searchParams }: PageProps<"/[locale]/direction/eleves">) {
  const t = await getTranslations("students");
  const tNav = await getTranslations("nav");

  return (
    <>
      <PageHeader
        title={tNav("students")}
        description={t("list.hint")}
        actions={
          <Suspense fallback={null}>
            <HeaderActions />
          </Suspense>
        }
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Suspense fallback={<div className="h-11 w-72 rounded-full bg-white shadow-card" aria-hidden />}>
          <SearchInput placeholder={t("list.searchPlaceholder")} label={t("list.search")} />
          <ClassFilter />
        </Suspense>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <StudentsList searchParams={searchParams} />
      </Suspense>
    </>
  );
}
