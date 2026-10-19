import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { CreateSchoolForm } from "./create-school-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("platform.create");
  return { title: t("title") };
}

export default async function NewSchoolPage() {
  const t = await getTranslations("platform.create");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <CreateSchoolForm />
    </>
  );
}
