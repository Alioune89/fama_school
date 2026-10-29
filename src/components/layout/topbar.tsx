import { Suspense } from "react";
import { Bell, MessagesSquare, Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LogoMark } from "@/components/brand/logo";
import { NAVIGATION } from "@/config/navigation";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import type { Space } from "@/lib/auth/spaces";
import { SyncIndicator } from "./sync-indicator";
import { UserMenu, UserMenuSkeleton } from "./user-menu";

/** Saisies faites hors ligne sur ce téléphone, propres au compte connecté. */
async function SyncStatus() {
  const user = await getCurrentUser();
  return user ? <SyncIndicator userId={user.id} /> : null;
}

const iconButton =
  "relative inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-card ring-1 ring-line/70 transition-colors hover:bg-azure-50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

export async function Topbar({ space }: { space: Space }) {
  const t = await getTranslations("topbar");
  const tCommon = await getTranslations("common");
  const home = NAVIGATION[space].menu[0]!.href;
  const messagesHref = NAVIGATION[space].menu.find((item) => item.label === "messages")?.href;
  const searchHref = space === "direction" ? "/direction/eleves" : null;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-background/85 px-4 backdrop-blur sm:px-6 lg:h-20 lg:px-8">
      <Link href={home} className="lg:hidden" aria-label="Fama School">
        <LogoMark />
      </Link>

      {searchHref && (
        <form action={searchHref} role="search" className="hidden md:block">
          <label className="relative block">
            <span className="sr-only">{tCommon("search")}</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              name="q"
              placeholder={t("searchPlaceholder")}
              className="h-11 w-72 rounded-full border border-line bg-white pr-4 pl-11 text-sm text-ink shadow-card outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 xl:w-80"
            />
          </label>
        </form>
      )}

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* Les parents n'enregistrent rien hors ligne : pas de moteur de synchronisation à charger chez eux. */}
        {space !== "parent" && (
          <Suspense fallback={null}>
            <SyncStatus />
          </Suspense>
        )}
        {messagesHref && (
          <Link href={messagesHref} className={iconButton} aria-label={tCommon("messages")}>
            <MessagesSquare className="size-[18px]" aria-hidden strokeWidth={1.75} />
          </Link>
        )}
        <Suspense
          fallback={
            <span className={iconButton} aria-hidden>
              <Bell className="size-[18px]" strokeWidth={1.75} />
            </span>
          }
        >
          <NotificationBell className={iconButton} />
        </Suspense>
        <Suspense fallback={<UserMenuSkeleton />}>
          <UserMenu space={space} />
        </Suspense>
      </div>
    </header>
  );
}
