"use client";

import { Suspense, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Logo } from "@/components/brand/logo";
import { InstallCard } from "@/components/layout/install-card";
import { NavIcon } from "@/components/layout/nav-icon";
import { NAVIGATION, type NavItem, type NavLeaf } from "@/config/navigation";
import { signOut } from "@/features/auth/actions";
import { Link, usePathname } from "@/i18n/navigation";
import type { Space } from "@/lib/auth/spaces";
import { cn } from "@/lib/utils";

export function isActiveHref(pathname: string, href: string, home: string, exact = false): boolean {
  if (href === home || exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SoonBadge() {
  const t = useTranslations("common");
  return (
    <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground">
      <span className="size-1.5 rounded-full bg-sun-400" aria-hidden />
      {t("soon").toLowerCase()}
    </span>
  );
}

function NavGroup({ item, home, pathname, onNavigate }: { item: NavItem; home: string; pathname: string | null; onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const childActive = pathname !== null && (item.children?.some((child) => isActiveHref(pathname, child.href, home, child.exact)) ?? false);
  const [open, setOpen] = useState(childActive);

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-sidebar-foreground transition-colors hover:bg-azure-50 hover:text-ink",
          childActive && "bg-sidebar-accent font-semibold text-ink hover:bg-sidebar-accent",
        )}
      >
        <NavIcon name={item.icon} className="size-5" />
        <span>{t(item.label)}</span>
        <ChevronDown className={cn("ml-auto size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ul className="mt-1 mb-2 ml-6 space-y-0.5 border-l-2 border-line pl-3">
          {item.children!.map((child) => (
            <NavLeafLink key={child.href} leaf={child} home={home} pathname={pathname} nested onNavigate={onNavigate} />
          ))}
        </ul>
      )}
    </li>
  );
}

function NavLeafLink({
  leaf,
  home,
  icon,
  nested,
  pathname,
  onNavigate,
}: {
  leaf: NavLeaf;
  home: string;
  icon?: NavItem["icon"];
  nested?: boolean;
  pathname: string | null;
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  const active = pathname !== null && isActiveHref(pathname, leaf.href, home, leaf.exact);

  return (
    <li>
      <Link
        href={leaf.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 text-sidebar-foreground transition-colors hover:bg-azure-50 hover:text-ink",
          nested ? "py-2 text-sm" : "py-2.5 text-[15px] font-medium",
          active && (nested ? "font-semibold text-ink" : "bg-sidebar-accent font-semibold text-ink hover:bg-sidebar-accent"),
        )}
      >
        {icon && <NavIcon name={icon} className="size-5" />}
        <span className="truncate">{t(leaf.label)}</span>
        {leaf.soon && !nested && <SoonBadge />}
      </Link>
    </li>
  );
}

/**
 * Menu d'un espace. Le chemin courant n'est connu qu'à la requête sur les routes dynamiques
 * (/professeurs/[id]) : le menu est prérendu sans rubrique active, puis surligné (voir SidebarNav).
 */
function SidebarNavContent({ space, pathname, onNavigate }: { space: Space; pathname: string | null; onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { menu, other } = NAVIGATION[space];
  const home = menu[0]!.href;

  return (
    <nav aria-label={tCommon("menu")} className="flex flex-col gap-6">
      <div>
        <p className="px-3 pb-2 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {t("sectionMenu")}
        </p>
        <ul className="space-y-1">
          {menu.map((item) =>
            item.children ? (
              <NavGroup key={item.href} item={item} home={home} pathname={pathname} onNavigate={onNavigate} />
            ) : (
              <NavLeafLink key={item.href} leaf={item} icon={item.icon} home={home} pathname={pathname} onNavigate={onNavigate} />
            ),
          )}
        </ul>
      </div>
      <div>
        <p className="px-3 pb-2 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {t("sectionOther")}
        </p>
        <ul className="space-y-1">
          {other.map((item) => (
            <NavLeafLink key={item.href} leaf={item} icon={item.icon} home={home} pathname={pathname} onNavigate={onNavigate} />
          ))}
          <li>
            <form action={signOut.bind(null, locale)}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-sidebar-foreground transition-colors hover:bg-danger-50 hover:text-danger-700"
              >
                <LogOut className="size-5" aria-hidden strokeWidth={1.75} />
                {tCommon("signOut")}
              </button>
            </form>
          </li>
        </ul>
      </div>
    </nav>
  );
}

function SidebarNavLive({ space, onNavigate }: { space: Space; onNavigate?: () => void }) {
  const pathname = usePathname();
  return <SidebarNavContent space={space} pathname={pathname} onNavigate={onNavigate} />;
}

export function SidebarNav({ space, onNavigate }: { space: Space; onNavigate?: () => void }) {
  return (
    <Suspense fallback={<SidebarNavContent space={space} pathname={null} onNavigate={onNavigate} />}>
      <SidebarNavLive space={space} onNavigate={onNavigate} />
    </Suspense>
  );
}

export function Sidebar({ space }: { space: Space }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-70 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="px-6 pt-7 pb-6">
        {/* Le logo ramène à la page d'accueil du site ; « Tableau de bord » (menu) ramène à l'espace. */}
        <Link href="/" className="inline-flex rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          <Logo />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <SidebarNav space={space} />
      </div>
      <div className="p-4">
        <InstallCard />
      </div>
    </aside>
  );
}
