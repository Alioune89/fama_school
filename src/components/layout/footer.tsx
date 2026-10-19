import { Mail, Phone } from "lucide-react";
import { cacheLife } from "next/cache";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function Footer({ className }: { className?: string }) {
  const t = await getTranslations("footer");
  const year = await currentYear();

  return (
    <footer
      className={cn(
        "flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:px-8",
        className,
      )}
    >
      <a href={`mailto:${t("email")}`} className="inline-flex items-center gap-1.5 hover:text-ink">
        <Mail className="size-3.5" aria-hidden />
        {t("email")}
      </a>
      <a href={`tel:${t("phone").replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-ink">
        <Phone className="size-3.5" aria-hidden />
        {t("phone")}
      </a>
      <span className="ml-auto flex flex-wrap gap-x-6 gap-y-2">
        <span>{t("terms")}</span>
        <span>{t("privacy")}</span>
        <span>{t("copyright", { year })}</span>
      </span>
    </footer>
  );
}
