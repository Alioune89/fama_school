import {
  ChevronRight,
  CircleCheckBig,
  ClipboardCheck,
  FileCheck2,
  MessagesSquare,
  ReceiptText,
  UserPlus,
  Wallet,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { TodayTask, TodayTaskKey } from "../today";

const ICONS: Record<TodayTaskKey, typeof ClipboardCheck> = {
  rollCalls: ClipboardCheck,
  justifications: FileCheck2,
  preregistrations: UserPlus,
  cancellations: ReceiptText,
  overdue: Wallet,
  messages: MessagesSquare,
};

/** « À faire aujourd'hui » : une ligne par tâche en attente, toute la ligne ouvre la page où la traiter. */
export async function TodayTasks({ tasks }: { tasks: TodayTask[] }) {
  const t = await getTranslations("dashboard.today");

  return (
    <section aria-labelledby="today-tasks" className="mb-6 rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70">
      <h2 id="today-tasks" className="text-lg font-semibold">
        {t("title")}
      </h2>
      {tasks.length === 0 ? (
        <p className="mt-3 flex items-center gap-3 text-sm text-ink-soft">
          <CircleCheckBig className="size-6 shrink-0 text-success-700" aria-hidden />
          <span>
            <span className="block font-semibold text-ink">{t("allClear")}</span>
            {t("allClearHint")}
          </span>
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {tasks.map((task) => {
            const Icon = ICONS[task.key];
            return (
              <li key={task.key}>
                <Link
                  href={task.href}
                  className="group flex items-center gap-3 rounded-xl bg-sun-50 px-4 py-3 ring-1 ring-sun-200 transition-colors hover:bg-sun-100 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-ink ring-1 ring-sun-200">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 font-medium text-ink">{t(`tasks.${task.key}`, { count: task.count })}</span>
                  <ChevronRight
                    className="size-5 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function TodayTasksSkeleton() {
  return <div className="mb-6 h-36 animate-pulse rounded-xl bg-white shadow-card ring-1 ring-line/70" aria-hidden />;
}
