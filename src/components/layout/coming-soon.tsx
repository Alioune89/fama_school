import { Hammer } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "./empty-state";
import { PageHeader } from "./page-header";

export async function ComingSoon({ title }: { title: string }) {
  const t = await getTranslations("comingSoon");
  return (
    <>
      <PageHeader title={title} />
      <EmptyState icon={Hammer} title={t("title")} body={t("body")} />
    </>
  );
}
