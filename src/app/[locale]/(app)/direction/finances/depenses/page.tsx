import { Suspense } from "react";
import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FilterSelect } from "@/components/data/filter-select";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { todayInDakar } from "@/features/dashboard/calendar";
import { DeleteExpenseButton } from "@/features/expenses/components/delete-expense-button";
import { ExpenseSheet } from "@/features/expenses/components/expense-sheet";
import { listExpenses } from "@/features/expenses/queries";
import { permissions } from "@/lib/auth/permissions";
import { requireSpace } from "@/lib/auth/session";
import { shiftMonth } from "@/lib/domain/fees";
import { formatDate, formatXOF } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("expenses") };
}

type SearchParams = PageProps<"/[locale]/direction/finances/depenses">["searchParams"];

const monthLabel = (month: string) =>
  new Date(`${month}-01T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

/** Dépenses d'un mois (?mois=2026-10, le mois en cours par défaut), avec total par catégorie. */
async function Expenses({ searchParams }: { searchParams: SearchParams }) {
  const [params, { entry }, t] = await Promise.all([searchParams, requireSpace("direction"), getTranslations("expenses")]);
  if (!permissions.manageFinance(entry.roles)) notFound();
  const today = todayInDakar();
  const current = today.slice(0, 7);
  const months = Array.from({ length: 12 }, (_, index) => shiftMonth(current, -index));
  const month = months.find((m) => m === params.mois) ?? current;
  const expenses = await listExpenses(entry.schoolId!, month);
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const byCategory = [...new Set(expenses.map((e) => e.category))]
    .map((category) => ({
      category,
      amount: expenses.filter((e) => e.category === category).reduce((sum, e) => sum + e.amount, 0),
    }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterSelect
          param="mois"
          label={t("month")}
          allLabel={monthLabel(current)}
          allValue={current}
          value={month}
          options={months.slice(1).map((m) => ({ value: m, label: monthLabel(m) }))}
        />
        <ExpenseSheet today={today} />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <div className="rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70">
          <p className="text-sm text-muted-foreground">{t("monthTotal")}</p>
          <p className="tabular mt-1 text-2xl font-bold text-ink">{formatXOF(total)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70">
          <p className="text-sm text-muted-foreground">{t("byCategory")}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {byCategory.length === 0 ? (
              <li className="text-sm text-muted-foreground">—</li>
            ) : (
              byCategory.map(({ category, amount }) => (
                <li key={category} className="tabular rounded-full bg-azure-50 px-3 py-1 text-sm">
                  <span className="text-ink-soft">{t(`categories.${category}`)} :</span>{" "}
                  <span className="font-semibold">{formatXOF(amount)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {expenses.length === 0 ? (
        <EmptyState icon={Receipt} title={t("empty")} body={t("emptyHint")} />
      ) : (
        <ul className="grid gap-2" aria-label={t("listLabel")}>
          {expenses.map((expense) => (
            <li
              key={expense.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-white px-4 py-3 shadow-card ring-1 ring-line/70"
            >
              <span className="min-w-0 flex-1 basis-56">
                <span className="block truncate font-semibold text-ink">{expense.label}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {formatDate(expense.spentOn, { day: "numeric", month: "short" })} · {t(`categories.${expense.category}`)}
                  {expense.reference && ` · ${expense.reference}`}
                </span>
              </span>
              <span className="tabular font-semibold text-ink">{formatXOF(expense.amount)}</span>
              <DeleteExpenseButton id={expense.id} label={expense.label} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function ExpensesPage({ searchParams }: PageProps<"/[locale]/direction/finances/depenses">) {
  const [t, tNav] = await Promise.all([getTranslations("expenses"), getTranslations("nav")]);
  return (
    <>
      <PageHeader title={tNav("expenses")} description={t("description")} />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Expenses searchParams={searchParams} />
      </Suspense>
    </>
  );
}
