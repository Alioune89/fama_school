"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { SERIES } from "../series";

type Row = { id: string; name: string; girls: number; boys: number; capacity: number | null };

/** Barres horizontales empilées filles / garçons par classe, avec repère de capacité. */
export function HeadcountChart({ rows }: { rows: Row[] }) {
  const t = useTranslations("dashboard.headcount");
  const [active, setActive] = useState<string | null>(null);
  const scale = Math.max(1, ...rows.map((row) => Math.max(row.capacity ?? 0, row.girls + row.boys)));
  const pct = (value: number) => `${(value / scale) * 100}%`;

  return (
    <div>
      <ul className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft" aria-label={t("legend")}>
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden className={cn("size-2.5 rounded-[3px]", SERIES.girls.bar)} />
          {t("girls")}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden className={cn("size-2.5 rounded-[3px]", SERIES.boys.bar)} />
          {t("boys")}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-3.5 w-0.5 rounded-full bg-ink/35" />
          {t("capacity")}
        </li>
      </ul>

      <ul className="space-y-1">
        {rows.map((row) => {
          const total = row.girls + row.boys;
          const full = row.capacity !== null && total >= row.capacity;
          return (
            <li key={row.id} className="relative">
              <Link
                href={`/direction/classes/${row.id}`}
                aria-label={t("rowLabel", { name: row.name, total, girls: row.girls, boys: row.boys })}
                onPointerEnter={() => setActive(row.id)}
                onPointerLeave={() => setActive((current) => (current === row.id ? null : current))}
                onFocus={() => setActive(row.id)}
                onBlur={() => setActive(null)}
                className="grid grid-cols-[4.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 rounded-lg px-2 py-1.5 outline-none hover:bg-azure-50/70 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="truncate text-sm font-semibold text-ink">{row.name}</span>
                <span className="relative h-5" aria-hidden>
                  <span className="absolute inset-y-1 left-0 flex w-full gap-0.5">
                    {row.girls > 0 && (
                      <span
                        className={cn("h-full", SERIES.girls.bar, row.boys === 0 && "rounded-r-[4px]")}
                        style={{ width: pct(row.girls) }}
                      />
                    )}
                    {row.boys > 0 && (
                      <span className={cn("h-full rounded-r-[4px]", SERIES.boys.bar)} style={{ width: pct(row.boys) }} />
                    )}
                  </span>
                  {row.capacity !== null && (
                    <span
                      className="absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-ink/35"
                      style={{ left: pct(row.capacity) }}
                    />
                  )}
                </span>
                <span className={cn("tabular text-right text-xs", full ? "font-semibold text-warning-700" : "text-ink-soft")}>
                  {row.capacity ? `${total} / ${row.capacity}` : total}
                </span>
              </Link>
              {active === row.id && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute top-full left-24 z-10 mt-1 min-w-40 rounded-lg bg-white px-3 py-2 text-xs shadow-card ring-1 ring-line"
                >
                  <p className="text-sm font-bold text-ink">
                    {row.capacity ? t("tooltipTotalOf", { total, capacity: row.capacity }) : t("tooltipTotal", { total })}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-ink-soft">
                    <span aria-hidden className={cn("w-3 border-t-2", SERIES.girls.stroke)} />
                    <span className="tabular font-semibold text-ink">{row.girls}</span> {t("girls").toLowerCase()}
                  </p>
                  <p className="flex items-center gap-2 text-ink-soft">
                    <span aria-hidden className={cn("w-3 border-t-2", SERIES.boys.stroke)} />
                    <span className="tabular font-semibold text-ink">{row.boys}</span> {t("boys").toLowerCase()}
                  </p>
                  <p className="mt-1 text-muted-foreground">{row.name}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
