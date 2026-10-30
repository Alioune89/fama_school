import type { Space } from "@/lib/auth/spaces";

export type NavIconName =
  | "home"
  | "students"
  | "teachers"
  | "staff"
  | "classes"
  | "attendance"
  | "grades"
  | "finance"
  | "announcements"
  | "calendar"
  | "messages"
  | "profile"
  | "settings"
  | "rollCall"
  | "programme"
  | "homework"
  | "children"
  | "payments"
  | "schools"
  | "demoRequests"
  | "plans"
  | "reports"
  | "website";

/** Clés de traduction du namespace « nav ». */
export type NavLabelKey =
  | "dashboard"
  | "students"
  | "guardians"
  | "teachers"
  | "staff"
  | "classes"
  | "attendance"
  | "grades"
  | "finance"
  | "feesCollection"
  | "invoices"
  | "feeSchedule"
  | "expenses"
  | "financeOverview"
  | "overdue"
  | "announcements"
  | "calendar"
  | "messages"
  | "profile"
  | "settings"
  | "home"
  | "myClasses"
  | "rollCall"
  | "gradeEntry"
  | "programme"
  | "homework"
  | "parentHomework"
  | "dailyReport"
  | "dailyReports"
  | "children"
  | "payments"
  | "schools"
  | "demoRequests"
  | "plans"
  | "reports"
  | "schoolSite";

export type NavLeaf = {
  label: NavLabelKey;
  href: string;
  soon?: boolean;
  /** Actif sur cette adresse seulement (vue d'ensemble d'une rubrique dont les pages sont ses sous-adresses). */
  exact?: boolean;
};
export type NavItem = NavLeaf & {
  icon: NavIconName;
  children?: NavLeaf[];
  /** Libellé court pour la barre d'onglets mobile. */
  shortLabel?: NavLabelKey;
};

export type SpaceNavigation = {
  menu: NavItem[];
  other: NavItem[];
  /** Entrées de la barre d'onglets mobile (4 au plus, la 5e ouvre le menu complet). */
  mobile: NavItem[];
};

/** Sélection des onglets mobiles par rubrique (robuste à l'ordre du menu). */
function pick(items: NavItem[], labels: NavLabelKey[]): NavItem[] {
  return labels.map((label) => {
    const item = items.find((candidate) => candidate.label === label);
    if (!item) throw new Error(`Rubrique absente du menu : ${label}`);
    return item;
  });
}

const direction: SpaceNavigation = {
  menu: [
    { label: "dashboard", shortLabel: "home", href: "/direction", icon: "home" },
    { label: "students", href: "/direction/eleves", icon: "students" },
    { label: "guardians", href: "/direction/parents", icon: "children" },
    { label: "teachers", href: "/direction/professeurs", icon: "teachers" },
    { label: "staff", href: "/direction/personnel", icon: "staff" },
    { label: "classes", href: "/direction/classes", icon: "classes" },
    { label: "attendance", href: "/direction/presences", icon: "attendance" },
    { label: "grades", href: "/direction/notes", icon: "grades" },
    {
      label: "finance",
      href: "/direction/finances",
      icon: "finance",
      children: [
        { label: "financeOverview", href: "/direction/finances", exact: true },
        { label: "feesCollection", href: "/direction/finances/encaissements" },
        { label: "overdue", href: "/direction/finances/impayes" },
        { label: "invoices", href: "/direction/finances/factures" },
        { label: "feeSchedule", href: "/direction/finances/frais" },
        { label: "expenses", href: "/direction/finances/depenses" },
      ],
    },
    { label: "programme", href: "/direction/programme", icon: "programme" },
    { label: "homework", href: "/direction/cahier-de-textes", icon: "homework" },
    { label: "dailyReports", href: "/direction/rapports", icon: "reports" },
    { label: "announcements", href: "/direction/annonces", icon: "announcements" },
    { label: "calendar", href: "/direction/calendrier", icon: "calendar" },
    { label: "messages", href: "/direction/messages", icon: "messages" },
  ],
  other: [
    { label: "schoolSite", href: "/direction/site", icon: "website" },
    { label: "profile", href: "/direction/profil", icon: "profile" },
    { label: "settings", href: "/direction/parametres", icon: "settings" },
  ],
  mobile: [],
};
direction.mobile = pick(direction.menu, ["dashboard", "students", "attendance", "finance"]);

const professeur: SpaceNavigation = {
  menu: [
    { label: "home", href: "/professeur", icon: "home" },
    { label: "myClasses", href: "/professeur/classes", icon: "classes" },
    { label: "rollCall", href: "/professeur/appel", icon: "rollCall" },
    { label: "reports", href: "/professeur/signalements", icon: "reports" },
    { label: "gradeEntry", href: "/professeur/notes", icon: "grades" },
    { label: "announcements", href: "/professeur/annonces", icon: "announcements" },
    { label: "calendar", href: "/professeur/calendrier", icon: "calendar" },
    { label: "programme", href: "/professeur/programme", icon: "programme" },
    { label: "homework", href: "/professeur/cahier-de-textes", icon: "homework" },
    { label: "dailyReport", href: "/professeur/rapport", icon: "reports" },
    { label: "messages", href: "/professeur/messages", icon: "messages" },
  ],
  other: [{ label: "profile", href: "/professeur/profil", icon: "profile" }],
  mobile: [],
};
professeur.mobile = pick(professeur.menu, ["home", "rollCall", "reports", "messages"]);

const parent: SpaceNavigation = {
  menu: [
    { label: "children", href: "/parent", icon: "children" },
    { label: "parentHomework", href: "/parent/devoirs", icon: "homework" },
    { label: "payments", href: "/parent/paiements", icon: "payments" },
    { label: "announcements", href: "/parent/annonces", icon: "announcements" },
    { label: "calendar", href: "/parent/calendrier", icon: "calendar" },
    { label: "messages", href: "/parent/messages", icon: "messages" },
  ],
  other: [{ label: "profile", href: "/parent/profil", icon: "profile" }],
  mobile: [],
};
parent.mobile = parent.menu.slice(0, 4);

const plateforme: SpaceNavigation = {
  menu: [
    { label: "schools", href: "/plateforme", icon: "schools" },
    { label: "demoRequests", href: "/plateforme/demandes", icon: "demoRequests" },
    { label: "plans", href: "/plateforme/formules", icon: "plans", soon: true },
  ],
  other: [],
  mobile: [],
};
plateforme.mobile = plateforme.menu;

export const NAVIGATION: Record<Space, SpaceNavigation> = { direction, professeur, parent, plateforme };

/** Modules prévus mais pas encore livrés, par espace (pages « Bientôt »). */
export function plannedModuleSlugs(space: Space): string[][] {
  const { menu, other } = NAVIGATION[space];
  const home = NAVIGATION[space].menu[0]!.href;
  return [...menu, ...other]
    .flatMap((item) => [item, ...(item.children ?? [])])
    .filter((item) => item.soon && item.href !== home)
    .map((item) => item.href.slice(home.length + 1).split("/"));
}
