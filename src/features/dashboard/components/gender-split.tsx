import { getTranslations } from "next-intl/server";
import { formatInteger } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SERIES } from "../series";

/** Filles et garçons : deux nombres et une barre de proportion (pas de camembert à deux parts). */
export async function GenderSplit({ girls, boys }: { girls: number; boys: number }) {
  const t = await getTranslations("dashboard.gender");
  const total = girls + boys;
  const share = (value: number) => (total ? Math.round((value / total) * 100) : 0);

  return (
    <section className="rounded-xl bg-white p-6 shadow-card ring-1 ring-line/70">
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      {total === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            {(["girls", "boys"] as const).map((key) => {
              const value = key === "girls" ? girls : boys;
              return (
                <div key={key}>
                  <dt className="flex items-center gap-1.5 text-sm text-ink-soft">
                    <span aria-hidden className={cn("size-2.5 rounded-[3px]", SERIES[key].bar)} />
                    {t(key)}
                  </dt>
                  <dd className="mt-1">
                    <span className="tabular text-3xl font-bold tracking-tight text-ink">{share(value)} %</span>
                    <span className="tabular ml-2 text-sm text-muted-foreground">{formatInteger(value)}</span>
                  </dd>
                </div>
              );
            })}
          </dl>
          <div className="mt-4 flex h-3 gap-0.5" aria-hidden>
            {girls > 0 && (
              <span
                className={cn("h-full rounded-l-[4px]", SERIES.girls.bar, boys === 0 && "rounded-r-[4px]")}
                style={{ width: `${share(girls)}%` }}
              />
            )}
            {boys > 0 && (
              <span className={cn("h-full flex-1 rounded-r-[4px]", SERIES.boys.bar, girls === 0 && "rounded-l-[4px]")} />
            )}
          </div>
        </>
      )}
    </section>
  );
}
