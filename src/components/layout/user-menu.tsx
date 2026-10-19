import { getTranslations } from "next-intl/server";
import { requireSpace } from "@/lib/auth/session";
import type { Space } from "@/lib/auth/spaces";
import { initials } from "@/lib/format";
import { UserMenuClient } from "./user-menu-client";

/** Identité de l'utilisateur dans la barre du haut (donnée de requête : toujours sous <Suspense>). */
export async function UserMenu({ space }: { space: Space }) {
  const { user, entry } = await requireSpace(space);
  const t = await getTranslations("roles");

  const roleLabel =
    space === "plateforme" ? t("platformAdmin") : entry.roles.map((role) => t(role)).join(" · ") || t("parent");

  return (
    <UserMenuClient
      fullName={user.fullName ?? user.phone ?? user.email ?? ""}
      initials={initials(user.fullName)}
      roleLabel={roleLabel}
      schoolName={entry.schoolName}
      profileHref={space === "plateforme" ? null : `/${space}/profil`}
      canSwitchSpace={user.spaces.length > 1}
    />
  );
}

export function UserMenuSkeleton() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <div className="hidden flex-col items-end gap-1.5 sm:flex">
        <div className="h-3.5 w-24 animate-pulse rounded-full bg-line" />
        <div className="h-3 w-14 animate-pulse rounded-full bg-line" />
      </div>
      <div className="size-10 animate-pulse rounded-full bg-line" />
    </div>
  );
}
