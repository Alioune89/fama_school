import type { AppRole, Space } from "@/lib/auth/spaces";

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
  /** Rôles qui voient l'entrée (absent : tous). Le menu suit le métier ; la base garde seule l'accès aux données. */
  roles?: readonly AppRole[];
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
  /** Entrées de la barre d'onglets mobile, par priorité : les 4 premières visibles du rôle (la 5e ouvre le menu). */
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

// Rôles de direction par métier : pédagogie (censeur), vie scolaire (surveillant), caisse (comptable),
// scolarité (secrétaire). Le fondateur et le directeur voient tout.
const LEAD = ["owner", "director"] as const satisfies readonly AppRole[];
const PEDAGOGY = [...LEAD, "censor"] as const satisfies readonly AppRole[];

const direction: SpaceNavigation = {
  menu: [
    { label: "dashboard", shortLabel: "home", href: "/direction", icon: "home" },
    { label: "students", href: "/direction/eleves", icon: "students" },
    {
      label: "guardians",
      href: "/direction/parents",
      icon: "children",
      roles: [...LEAD, "supervisor", "accountant", "secretary"],
    },
    { label: "teachers", href: "/direction/professeurs", icon: "teachers", roles: [...PEDAGOGY, "secretary"] },
    { label: "staff", href: "/direction/personnel", icon: "staff", roles: [...LEAD, "secretary"] },
    { label: "classes", href: "/direction/classes", icon: "classes", roles: [...PEDAGOGY, "supervisor", "secretary"] },
    { label: "attendance", href: "/direction/presences", icon: "attendance", roles: [...PEDAGOGY, "supervisor"] },
    { label: "grades", href: "/direction/notes", icon: "grades", roles: [...PEDAGOGY, "secretary"] },
    {
      label: "finance",
      href: "/direction/finances",
      icon: "finance",
      roles: [...LEAD, "accountant"],
      children: [
        { label: "financeOverview", href: "/direction/finances", exact: true },
        { label: "feesCollection", href: "/direction/finances/encaissements" },
        { label: "overdue", href: "/direction/finances/impayes" },
        { label: "invoices", href: "/direction/finances/factures" },
        { label: "feeSchedule", href: "/direction/finances/frais" },
        { label: "expenses", href: "/direction/finances/depenses" },
      ],
    },
    { label: "programme", href: "/direction/programme", icon: "programme", roles: PEDAGOGY },
    { label: "homework", href: "/direction/cahier-de-textes", icon: "homework", roles: PEDAGOGY },
    { label: "dailyReports", href: "/direction/rapports", icon: "reports", roles: PEDAGOGY },
    { label: "announcements", href: "/direction/annonces", icon: "announcements" },
    { label: "calendar", href: "/direction/calendrier", icon: "calendar" },
    // Boîte de réception de l'école (private.inbox_roles) : le comptable n'y a pas accès.
    { label: "messages", href: "/direction/messages", icon: "messages", roles: [...PEDAGOGY, "supervisor", "secretary"] },
  ],
  other: [
    { label: "schoolSite", href: "/direction/site", icon: "website", roles: [...PEDAGOGY, "secretary"] },
    { label: "profile", href: "/direction/profil", icon: "profile" },
    { label: "settings", href: "/direction/parametres", icon: "settings", roles: PEDAGOGY },
  ],
  mobile: [],
};
direction.mobile = pick(direction.menu, ["dashboard", "students", "attendance", "finance", "grades", "guardians", "calendar"]);

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
    { label: "plans", href: "/plateforme/formules", icon: "plans" },
  ],
  other: [],
  mobile: [],
};
plateforme.mobile = plateforme.menu;

export const NAVIGATION: Record<Space, SpaceNavigation> = { direction, professeur, parent, plateforme };

const visibleTo = (roles: readonly AppRole[] | null) => (item: NavLeaf) =>
  !item.roles || (roles !== null && item.roles.some((role) => roles.includes(role)));

/**
 * Menu d'un espace pour les rôles de l'utilisateur. Sans rôles (coquille prérendue, avant la session),
 * seules les entrées communes à tous apparaissent ; les autres arrivent avec la session.
 */
export function navigationFor(space: Space, roles: readonly AppRole[] | null): SpaceNavigation {
  const { menu, other, mobile } = NAVIGATION[space];
  const visible = visibleTo(roles);
  return {
    menu: menu.filter(visible),
    other: other.filter(visible),
    mobile: mobile.filter(visible).slice(0, 4),
  };
}

/** Rôles qui voient la rubrique `href` d'un espace (null : tous). Sert aussi à verrouiller ses pages. */
export function sectionRoles(space: Space, href: string): readonly AppRole[] | null {
  const { menu, other } = NAVIGATION[space];
  return [...menu, ...other].find((item) => item.href === href)?.roles ?? null;
}
