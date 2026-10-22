import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Onglets de la rubrique Présences : la journée, la grille du mois, le journal des appels, les justificatifs. */
export async function AttendanceTabs({ active }: { active: "day" | "grid" | "history" | "justifications" }) {
  const t = await getTranslations("attendance.direction");
  const tabs = [
    { key: "day", href: "/direction/presences", label: t("tabDay") },
    { key: "grid", href: "/direction/presences/grille", label: t("tabGrid") },
    { key: "history", href: "/direction/presences/historique", label: t("tabHistory") },
    { key: "justifications", href: "/direction/presences/justificatifs", label: t("tabJustifications") },
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
