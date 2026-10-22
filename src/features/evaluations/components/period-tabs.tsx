import { Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Period } from "../queries";

/** Choix de la période (?periode=), en gardant les autres paramètres de la page. */
export async function PeriodTabs({
  periods,
  active,
  basePath,
  params = {},
}: {
  periods: Period[];
  active: string;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  const t = await getTranslations("evaluations");
  if (periods.length < 2) return null;
  const href = (periodId: string) => {
    const search = new URLSearchParams(
      Object.entries({ ...params, periode: periodId }).filter(([, v]) => v) as [string, string][],
    );
    return `${basePath}?${search.toString()}`;
  };
  return (
    <nav aria-label={t("periodsLabel")} className="flex flex-wrap gap-2">
      {periods.map((period) => (
        <Link
          key={period.id}
          href={href(period.id)}
          aria-current={period.id === active ? "page" : undefined}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition-colors",
            period.id === active ? "bg-ink text-white ring-ink" : "bg-white text-ink-soft ring-line hover:text-ink",
          )}
        >
          {period.locked && <Lock className="size-3.5" aria-label={t("locked")} />}
          {period.label}
        </Link>
      ))}
    </nav>
  );
}
