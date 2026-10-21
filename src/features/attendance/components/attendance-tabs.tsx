import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Onglets de la rubrique Présences : la journée, la grille du mois, le journal des appels. */
export async function AttendanceTabs({ active }: { active: "day" | "grid" | "history" }) {
  const t = await getTranslations("attendance.direction");
  const tabs = [
    { key: "day", href: "/direction/presences", label: t("tabDay") },
    { key: "grid", href: "/direction/presences/grille", label: t("tabGrid") },
    { key: "history", href: "/direction/presences/historique", label: t("tabHistory") },
  ] as const;
  return (
    <nav aria-label={t("tabsLabel")} className="mb-5 inline-flex rounded-full bg-white p-1 shadow-card ring-1 ring-line/70">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={active === tab.key ? "page" : undefined}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
            active === tab.key ? "bg-azure-100 text-ink" : "text-ink-soft hover:text-ink",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
