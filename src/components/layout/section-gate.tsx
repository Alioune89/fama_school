import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { NAVIGATION, sectionRoles } from "@/config/navigation";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";
import type { Space } from "@/lib/auth/spaces";
import { EmptyState } from "./empty-state";

/**
 * Verrou d'une rubrique : hors des rôles prévus au menu (src/config/navigation.ts), la page n'est pas
 * rendue, même en tapant son adresse. La base applique les mêmes règles à la lecture des données.
 */
export async function SectionGate({ space, href, children }: { space: Space; href: string; children: ReactNode }) {
  const roles = sectionRoles(space, href);
  const { entry } = await requireSpace(space);
  if (!roles || roles.some((role) => entry.roles.includes(role))) return children;

  const [t, tRoles] = await Promise.all([getTranslations("sectionGate"), getTranslations("roles")]);
  return (
    <EmptyState
      icon={Lock}
      title={t("title")}
      body={t("body", { roles: roles.map((role) => tRoles(role)).join(", ") })}
      action={
        <Link href={NAVIGATION[space].menu[0]!.href} className={buttonVariants()}>
          {t("back")}
        </Link>
      }
    />
  );
}

export function SectionGateFallback() {
  return <div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />;
}
