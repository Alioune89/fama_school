import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { StudentImport } from "@/features/students/components/student-import";
import { listClassOptions, listExistingStudents } from "@/features/students/queries";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("students.import");
  return { title: t("title") };
}

async function ImportWizard() {
  const { entry } = await requireSpace("direction");
  const t = await getTranslations("students.import");
  if (!permissions.managePeople(entry.roles)) {
    return <p className="rounded-xl bg-warning-50 p-4 text-sm text-warning-700">{t("forbidden")}</p>;
  }
  const [{ classes, yearLabel }, existing] = await Promise.all([
    listClassOptions(entry.schoolId!),
    listExistingStudents(entry.schoolId!),
  ]);
  if (!yearLabel || classes.length === 0) {
    return (
      <p className="rounded-xl bg-warning-50 p-4 text-sm text-warning-700">
        {t("noClasses")}{" "}
        <Link href="/direction/parametres" className="font-semibold underline">
          {t("goToSettings")}
        </Link>
      </p>
    );
  }
  return <StudentImport classNames={classes.map((c) => c.name)} existing={existing} />;
}

export default async function ImportStudentsPage() {
  const t = await getTranslations("students");
  return (
    <>
      <Link
        href="/direction/eleves"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("detail.back")}
      </Link>
      <PageHeader className="mt-4" title={t("import.title")} description={t("import.hint")} />
      <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <ImportWizard />
      </Suspense>
    </>
  );
}
