import type { Enums } from "@/lib/supabase/database.types";

export type AppRole = Enums<"app_role">;
export type Space = "direction" | "professeur" | "parent" | "plateforme";

export const STAFF_ROLES = ["owner", "director", "censor", "supervisor", "accountant", "secretary"] as const satisfies readonly AppRole[];

export const SPACE_HOME: Record<Space, string> = {
  direction: "/direction",
  professeur: "/professeur",
  parent: "/parent",
  plateforme: "/plateforme",
};

/** Préfixes d'URL réservés aux comptes connectés. */
export const PROTECTED_PREFIXES = ["/direction", "/professeur", "/parent", "/plateforme", "/choisir-espace"] as const;

export function isStaffRole(role: AppRole): boolean {
  return (STAFF_ROLES as readonly AppRole[]).includes(role);
}

export function spaceForRole(role: AppRole): Space | null {
  if (isStaffRole(role)) return "direction";
  if (role === "teacher") return "professeur";
  if (role === "parent") return "parent";
  return null;
}

export type MembershipSummary = {
  role: AppRole;
  schoolId: string;
  schoolName: string;
};

export type SpaceEntry = {
  space: Space;
  /** École concernée (absente pour l'espace parent, qui regroupe tous les enfants, et la plateforme). */
  schoolId: string | null;
  schoolName: string | null;
  roles: AppRole[];
};

/**
 * Espaces accessibles à un compte : un espace direction ou professeur par école,
 * un seul espace parent (les enfants peuvent être dans plusieurs écoles), et la plateforme.
 */
export function listSpaces(memberships: MembershipSummary[], isPlatformAdmin: boolean): SpaceEntry[] {
  const entries = new Map<string, SpaceEntry>();

  for (const membership of memberships) {
    const space = spaceForRole(membership.role);
    if (!space) continue;
    const perSchool = space !== "parent";
    const key = perSchool ? `${space}:${membership.schoolId}` : space;
    const entry = entries.get(key) ?? {
      space,
      schoolId: perSchool ? membership.schoolId : null,
      schoolName: perSchool ? membership.schoolName : null,
      roles: [],
    };
    if (!entry.roles.includes(membership.role)) entry.roles.push(membership.role);
    entries.set(key, entry);
  }

  const order: Space[] = ["plateforme", "direction", "professeur", "parent"];
  const list = [...entries.values()];
  if (isPlatformAdmin) list.push({ space: "plateforme", schoolId: null, schoolName: null, roles: [] });

  return list.sort(
    (a, b) => order.indexOf(a.space) - order.indexOf(b.space) || (a.schoolName ?? "").localeCompare(b.schoolName ?? "", "fr"),
  );
}

/** Retire le préfixe de langue (/wo) pour comparer les chemins. */
export function stripLocalePrefix(pathname: string, locales: readonly string[]): { locale: string | null; path: string } {
  const [, first, ...rest] = pathname.split("/");
  if (first && locales.includes(first)) {
    return { locale: first, path: `/${rest.join("/")}`.replace(/\/$/, "") || "/" };
  }
  return { locale: null, path: pathname.replace(/\/$/, "") || "/" };
}

export function isProtectedPath(path: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
