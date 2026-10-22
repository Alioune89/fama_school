import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Onglets de la rubrique Notes côté direction. */
export async function GradesTabs({ active }: { active: "evaluations" | "compositions" }) {
  const t = await getTranslations("evaluations");
  const tabs = [
    { key: "evaluations", href: "/direction/notes", label: t("tabEvaluations") },
    { key: "compositions", href: "/direction/notes/compositions", label: t("tabCompositions") },
  ] as const;
  return (
    <nav
      aria-label={t("tabsLabel")}
      className="mb-5 flex w-fit max-w-full overflow-x-auto rounded-full bg-white p-1 shadow-card ring-1 ring-line/70"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={active === tab.key ? "page" : undefined}
          className={cn(
            "shrink-0 rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors sm:px-4",
            active === tab.key ? "bg-azure-100 text-ink" : "text-ink-soft hover:text-ink",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
