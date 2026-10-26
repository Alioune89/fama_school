"use client";

import { Fragment, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useMessage } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { annualFees, billingMonths, shiftMonth } from "@/lib/domain/fees";
import { formatInteger, formatXOF } from "@/lib/format";
import { cn } from "@/lib/utils";
import { saveFeeGrid } from "../actions";
import type { FeeSchedule } from "../queries";

const key = (levelId: string, feeTypeId: string) => `${levelId}:${feeTypeId}`;

/** « 25 000 » → 25000 ; vide → 0 ; saisie invalide → null. */
function parseAmount(text: string): number | null {
  const value = text.replace(/[\s  .]/g, "");
  if (value === "") return 0;
  return /^\d{1,8}$/.test(value) && Number(value) <= 10_000_000 ? Number(value) : null;
}

const monthLabel = (month: string) =>
  new Date(`${month}-01T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * Montants de chaque frais par niveau pour l'année en cours, et calendrier des mensualités.
 * Le total annuel d'un niveau compte les frais obligatoires (les options s'ajoutent pour qui les choisit).
 */
export function FeeGrid({ data, canEdit }: { data: FeeSchedule; canEdit: boolean }) {
  const t = useTranslations("fees");
  const message = useMessage();
  const [pending, startTransition] = useTransition();
  const [installments, setInstallments] = useState(data.schedule.installments);
  const [firstMonth, setFirstMonth] = useState(data.schedule.firstMonth);
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(data.rates).map(([k, amount]) => [k, formatInteger(amount)])),
  );

  const amountOf = (levelId: string, feeTypeId: string) => parseAmount(texts[key(levelId, feeTypeId)] ?? "");
  const cells = data.levels.flatMap((level) => data.feeTypes.map((fee) => ({ level, fee, amount: amountOf(level.id, fee.id) })));
  const invalid = cells.filter((cell) => cell.amount === null).length;
  const changedRates = cells.filter(
    (cell) => cell.amount !== null && cell.amount !== (data.rates[key(cell.level.id, cell.fee.id)] ?? 0),
  );
  const scheduleChanged =
    !data.scheduleSaved || installments !== data.schedule.installments || firstMonth !== data.schedule.firstMonth;
  const months = billingMonths({ installments, firstMonth });

  // Mois de rentrée possibles : de deux mois avant à deux mois après le mois de la rentrée.
  const firstMonthChoices = [-2, -1, 0, 1, 2].map((delta) => `${shiftMonth(data.year.startsOn.slice(0, 7), delta)}-01`);

  function save() {
    startTransition(async () => {
      const result = await saveFeeGrid({
        yearId: data.year.id,
        installments,
        firstMonth,
        rates: changedRates.map((cell) => ({ levelId: cell.level.id, feeTypeId: cell.fee.id, amount: String(cell.amount) })),
      });
      if (result.ok) toast.success(t("gridSaved"));
      else toast.error(message(result.error));
    });
  }

  return (
    <section aria-labelledby="fee-grid" className="space-y-4 rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="fee-grid" className="text-lg font-semibold">
            {t("gridTitle", { year: data.year.label })}
          </h2>
          <p className="text-sm text-muted-foreground">{t("gridHint")}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs font-medium text-ink-soft">
            {t("installments")}
            <NativeSelect
              value={String(installments)}
              disabled={!canEdit}
              onChange={(event) => setInstallments(Number(event.target.value))}
              aria-label={t("installments")}
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>
                  {t("installmentsCount", { count })}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="grid gap-1 text-xs font-medium text-ink-soft">
            {t("firstMonth")}
            <NativeSelect
              value={firstMonth}
              disabled={!canEdit}
              onChange={(event) => setFirstMonth(event.target.value)}
              aria-label={t("firstMonth")}
            >
              {[...new Set([...firstMonthChoices, firstMonth])].sort().map((month) => (
                <option key={month} value={month}>
                  {monthLabel(month.slice(0, 7))}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>
      </div>
      <p className="text-sm text-ink-soft">
        {t("monthsRange", { first: monthLabel(months[0]!), last: monthLabel(months.at(-1)!), count: installments })}
      </p>

      {data.feeTypes.length === 0 || data.levels.length === 0 ? (
        <p className="text-sm text-muted-foreground">{data.levels.length === 0 ? t("noLevels") : t("noTypes")}</p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white py-2 pr-3 text-left font-semibold text-ink-soft">{t("level")}</th>
                {data.feeTypes.map((fee) => (
                  <th key={fee.id} className="px-2 py-2 text-right font-semibold text-ink-soft">
                    <span className="block text-ink">{fee.name}</span>
                    <span className="block text-xs font-normal">
                      {t(`frequencies.${fee.frequency}`)}
                      {fee.optional && ` · ${t("optionalBadge").toLowerCase()}`}
                    </span>
                  </th>
                ))}
                <th className="px-2 py-2 text-right font-semibold text-ink-soft">{t("annualTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {data.levels.map((level, index) => {
                const newCycle = index === 0 || data.levels[index - 1]!.cycleLabel !== level.cycleLabel;
                const total = annualFees(
                  data.feeTypes.map((fee) => ({
                    feeTypeId: fee.id,
                    amount: amountOf(level.id, fee.id) ?? 0,
                    frequency: fee.frequency,
                    optional: fee.optional,
                  })),
                  installments,
                  new Set(),
                  [],
                ).total;
                return (
                  <Fragment key={level.id}>
                    {newCycle && (
                      <tr>
                        <th
                          colSpan={data.feeTypes.length + 2}
                          className="pt-3 pb-1 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                        >
                          {level.cycleLabel}
                        </th>
                      </tr>
                    )}
                    <tr>
                      <th
                        scope="row"
                        className="sticky left-0 z-10 border-t border-line bg-white py-1.5 pr-3 text-left font-medium text-ink"
                      >
                        {level.label}
                      </th>
                      {data.feeTypes.map((fee) => {
                        const cellKey = key(level.id, fee.id);
                        const bad = amountOf(level.id, fee.id) === null;
                        return (
                          <td key={fee.id} className="border-t border-line px-2 py-1.5">
                            <input
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              disabled={!canEdit}
                              aria-label={t("amountFor", { fee: fee.name, level: level.label })}
                              aria-invalid={bad || undefined}
                              value={texts[cellKey] ?? ""}
                              placeholder="—"
                              onChange={(event) => setTexts((current) => ({ ...current, [cellKey]: event.target.value }))}
                              onBlur={() => {
                                const amount = amountOf(level.id, fee.id);
                                if (amount !== null)
                                  setTexts((current) => ({ ...current, [cellKey]: amount ? formatInteger(amount) : "" }));
                              }}
                              className={cn(
                                "tabular h-10 w-28 rounded-lg bg-white px-2.5 text-right ring-1 ring-line outline-none focus:ring-2 focus:ring-azure-500 disabled:bg-transparent disabled:ring-0",
                                bad && "bg-danger-50 ring-2 ring-danger-500",
                              )}
                            />
                          </td>
                        );
                      })}
                      <td className="tabular border-t border-line px-2 py-1.5 text-right font-semibold whitespace-nowrap text-ink">
                        {total ? formatXOF(total) : "—"}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && data.feeTypes.length > 0 && (
        <div className="sticky bottom-24 z-20 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-lg ring-1 ring-line/70 sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
          <p className="text-sm text-muted-foreground" role="status">
            {invalid > 0
              ? t("invalidCount", { count: invalid })
              : changedRates.length > 0 || scheduleChanged
                ? t("unsaved", { count: changedRates.length })
                : t("upToDate")}
          </p>
          <Button
            size="touch"
            onClick={save}
            disabled={pending || invalid > 0 || (changedRates.length === 0 && !scheduleChanged)}
          >
            {t("saveGrid")}
          </Button>
        </div>
      )}
    </section>
  );
}
