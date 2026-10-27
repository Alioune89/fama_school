"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatXOF } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ChartColumn = {
  key: string;
  label: string;
  shortLabel: string;
  billed: number;
  collected: number;
  remaining: number;
};

/** Couleurs validées (contraste et daltonisme) : encaissé en bleu Fama, reste à encaisser en orange. */
const COLLECTED = "#1570a6";
const REMAINING = "#eb6834";
const PLOT_HEIGHT = 180;

/**
 * Facturé par mois, en barres empilées : encaissé (bas) et reste à encaisser (haut). Survol ou focus d'une barre :
 * détail du mois. Le tableau des mêmes chiffres reste accessible sous le graphique.
 */
export function CollectionChart({ columns }: { columns: ChartColumn[] }) {
  const t = useTranslations("collections.chart");
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(...columns.map((column) => column.billed), 1);
  const current = columns.find((column) => column.key === active) ?? null;

  return (
    <figure className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft" aria-label={t("legend")}>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: COLLECTED }} aria-hidden />
            {t("collected")}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: REMAINING }} aria-hidden />
            {t("remaining")}
          </li>
        </ul>
        <p className="min-h-5 text-xs text-ink-soft" aria-live="polite">
          {current &&
            t("detail", {
              month: current.label,
              billed: formatXOF(current.billed),
              collected: formatXOF(current.collected),
              remaining: formatXOF(current.remaining),
            })}
        </p>
      </div>

      <div>
        <div className="flex items-end gap-0.5 border-b border-line sm:gap-1.5" style={{ height: PLOT_HEIGHT }}>
          {columns.map((column) => {
            const collected = (column.collected / max) * PLOT_HEIGHT;
            const remaining = (column.remaining / max) * PLOT_HEIGHT;
            return (
              <button
                key={column.key}
                type="button"
                aria-label={t("detail", {
                  month: column.label,
                  billed: formatXOF(column.billed),
                  collected: formatXOF(column.collected),
                  remaining: formatXOF(column.remaining),
                })}
                onMouseEnter={() => setActive(column.key)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(column.key)}
                onBlur={() => setActive(null)}
                className={cn(
                  "flex h-full min-w-0 flex-1 flex-col items-center justify-end rounded-t-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-azure-500",
                  active === column.key && "bg-azure-50",
                )}
              >
                {remaining > 0 && (
                  <span
                    className={cn("block w-full max-w-9 rounded-t-[4px]", collected > 0 && "mb-[2px]")}
                    style={{ height: Math.max(remaining - (collected > 0 ? 2 : 0), 2), backgroundColor: REMAINING }}
                  />
                )}
                {collected > 0 && (
                  <span
                    className={cn("block w-full max-w-9", remaining > 0 ? "" : "rounded-t-[4px]")}
                    style={{ height: Math.max(collected, 2), backgroundColor: COLLECTED }}
                  />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex gap-0.5 pt-1.5 sm:gap-1.5" aria-hidden>
          {columns.map((column) => (
            <span key={column.key} className="min-w-0 flex-1 truncate text-center text-[11px] text-muted-foreground">
              {column.shortLabel}
            </span>
          ))}
        </div>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-azure-700">{t("table")}</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-80 text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1.5 font-medium">{t("month")}</th>
                <th className="py-1.5 text-right font-medium">{t("billed")}</th>
                <th className="py-1.5 text-right font-medium">{t("collected")}</th>
                <th className="py-1.5 text-right font-medium">{t("remaining")}</th>
              </tr>
            </thead>
            <tbody className="tabular divide-y divide-line">
              {columns.map((column) => (
                <tr key={column.key}>
                  <td className="py-1.5">{column.label}</td>
                  <td className="py-1.5 text-right">{formatXOF(column.billed)}</td>
                  <td className="py-1.5 text-right">{formatXOF(column.collected)}</td>
                  <td className="py-1.5 text-right">{formatXOF(column.remaining)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
