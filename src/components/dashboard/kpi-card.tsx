import { ArrowDown, ArrowUp, Ellipsis } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { formatInteger } from "@/lib/format";
import { cn } from "@/lib/utils";

const tones = {
  lavender: "bg-lavender-200",
  sun: "bg-sun-200",
  azure: "bg-azure-200",
  white: "bg-white ring-1 ring-line/70",
} as const;

export type KpiTone = keyof typeof tones;

/** Carte d'indicateur pastel (maquettes : « 124 684 Élèves », tendance ↑ 15 %). */
export async function KpiCard({
  label,
  value,
  tone = "lavender",
  trend,
  className,
}: {
  label: string;
  value: number | string | null;
  tone?: KpiTone;
  /** Variation en points de pourcentage depuis la période précédente. */
  trend?: number;
  className?: string;
}) {
  const t = await getTranslations("common");
  const display = value === null ? "—" : typeof value === "number" ? formatInteger(value) : value;

  return (
    <div className={cn("flex min-h-36 flex-col justify-between rounded-xl p-5 text-ink shadow-card", tones[tone], className)}>
      <div className="flex items-center justify-between">
        {trend !== undefined ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-bold",
              trend >= 0 ? "text-success-700" : "text-danger-700",
            )}
          >
            {trend >= 0 ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />}
            <span className="sr-only">{trend >= 0 ? t("trendUp", { value: trend }) : t("trendDown", { value: -trend })}</span>
            <span aria-hidden>{Math.abs(trend)} %</span>
          </span>
        ) : (
          <span />
        )}
        <Ellipsis className="size-5 text-ink/50" aria-hidden />
      </div>
      <div>
        <p className="tabular text-3xl font-bold tracking-tight">{display}</p>
        <p className="mt-1 text-sm font-medium text-ink/80">{label}</p>
      </div>
    </div>
  );
}

export function KpiCardSkeleton({ tone = "lavender" }: { tone?: KpiTone }) {
  return (
    <div className={cn("flex min-h-36 flex-col justify-end gap-2 rounded-xl p-5", tones[tone])} aria-hidden>
      <div className="h-8 w-24 animate-pulse rounded-lg bg-white/60" />
      <div className="h-4 w-20 animate-pulse rounded-full bg-white/60" />
    </div>
  );
}
