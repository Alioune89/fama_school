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
  | "plans";

/** Clés de traduction du namespace « nav ». */
export type NavLabelKey =
  | "dashboard"
  | "students"
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
  | "children"
  | "payments"
  | "schools"
  | "plans";

export type NavLeaf = { label: NavLabelKey; href: string; soon?: boolean };
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
    { label: "teachers", href: "/direction/professeurs", icon: "teachers" },
    { label: "staff", href: "/direction/personnel", icon: "staff" },
    { label: "classes", href: "/direction/classes", icon: "classes", soon: true },
    { label: "attendance", href: "/direction/presences", icon: "attendance", soon: true },
    { label: "grades", href: "/direction/notes", icon: "grades", soon: true },
    {
      label: "finance",
      href: "/direction/finances",
      icon: "finance",
      soon: true,
      children: [
        { label: "feesCollection", href: "/direction/finances/encaissements", soon: true },
        { label: "invoices", href: "/direction/finances/factures", soon: true },
        { label: "feeSchedule", href: "/direction/finances/frais", soon: true },
        { label: "expenses", href: "/direction/finances/depenses", soon: true },
      ],
    },
    { label: "announcements", href: "/direction/annonces", icon: "announcements", soon: true },
    { label: "calendar", href: "/direction/calendrier", icon: "calendar", soon: true },
    { label: "messages", href: "/direction/messages", icon: "messages", soon: true },
  ],
  other: [
    { label: "profile", href: "/direction/profil", icon: "profile", soon: true },
    { label: "settings", href: "/direction/parametres", icon: "settings" },
  ],
  mobile: [],
};
direction.mobile = pick(direction.menu, ["dashboard", "students", "attendance", "finance"]);

const professeur: SpaceNavigation = {
  menu: [
    { label: "home", href: "/professeur", icon: "home" },
    { label: "myClasses", href: "/professeur/classes", icon: "classes", soon: true },
    { label: "rollCall", href: "/professeur/appel", icon: "rollCall", soon: true },
    { label: "gradeEntry", href: "/professeur/notes", icon: "grades", soon: true },
    { label: "programme", href: "/professeur/programme", icon: "programme", soon: true },
    { label: "homework", href: "/professeur/cahier-de-textes", icon: "homework", soon: true },
    { label: "messages", href: "/professeur/messages", icon: "messages", soon: true },
  ],
  other: [{ label: "profile", href: "/professeur/profil", icon: "profile", soon: true }],
  mobile: [],
};
professeur.mobile = pick(professeur.menu, ["home", "rollCall", "gradeEntry", "messages"]);

const parent: SpaceNavigation = {
  menu: [
    { label: "children", href: "/parent", icon: "children" },
    { label: "gradeEntry", href: "/parent/notes", icon: "grades", soon: true },
    { label: "attendance", href: "/parent/presences", icon: "attendance", soon: true },
    { label: "payments", href: "/parent/paiements", icon: "payments", soon: true },
    { label: "messages", href: "/parent/messages", icon: "messages", soon: true },
  ],
  other: [{ label: "profile", href: "/parent/profil", icon: "profile", soon: true }],
  mobile: [],
};
parent.mobile = parent.menu.slice(0, 4);

const plateforme: SpaceNavigation = {
  menu: [
    { label: "schools", href: "/plateforme", icon: "schools" },
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
