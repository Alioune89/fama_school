import { Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { EmptyState } from "@/components/layout/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo />
      <EmptyState
        icon={Compass}
        title={t("title")}
        body={t("body")}
        action={
          <Link href="/" className={buttonVariants()}>
            {t("action")}
          </Link>
        }
        className="w-full"
      />
    </main>
  );
}
