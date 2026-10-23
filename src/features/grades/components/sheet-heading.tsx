import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { Link } from "@/i18n/navigation";

/** Retour aux évaluations (sur la classe et la période de la feuille quand on les connaît), puis le titre. */
export function SheetHeading({ backHref }: { backHref: string }) {
  const t = useTranslations("grades");
  return (
    <>
      <Link href={backHref} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <PageHeader title={t("title")} />
    </>
  );
}
