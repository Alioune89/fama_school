import { Suspense } from "react";
import type { Metadata } from "next";
import { LayoutGrid } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { TeacherClassList, TeacherClassListFallback } from "@/features/attendance/components/teacher-class-list";
import { listTeacherClasses } from "@/features/attendance/queries";
import { todayInDakar } from "@/features/dashboard/calendar";
import { requireSpace } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("rollCall") };
}

async function Classes() {
  const { user, entry } = await requireSpace("professeur");
  const date = todayInDakar();
  const [classes, t] = await Promise.all([
    listTeacherClasses(entry.schoolId!, user.id, date),
    getTranslations("attendance.rollCall"),
  ]);
  if (classes.length === 0) return <EmptyState icon={LayoutGrid} title={t("noClasses")} body={t("noClassesHint")} />;
  return <TeacherClassList userId={user.id} date={date} classes={classes} />;
}

export default async function RollCallPage() {
  const t = await getTranslations("attendance.rollCall");
  return (
    <>
      <PageHeader title={t("title")} description={t("hint")} />
      <Suspense fallback={<TeacherClassListFallback />}>
        <Classes />
      </Suspense>
    </>
  );
}
