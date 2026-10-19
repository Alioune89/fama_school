"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/logo";
import { InstallCard } from "@/components/layout/install-card";
import { NavIcon } from "@/components/layout/nav-icon";
import { SidebarNav, isActiveHref } from "@/components/layout/sidebar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NAVIGATION } from "@/config/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import type { Space } from "@/lib/auth/spaces";
import { cn } from "@/lib/utils";

/** Barre d'onglets en bas d'écran sur téléphone (grosses cibles tactiles), menu complet dans un tiroir. */
export function MobileNav({ space }: { space: Space }) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { mobile, menu } = NAVIGATION[space];
  const home = menu[0]!.href;

  return (
    <>
      <nav
        aria-label={tCommon("menu")}
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {mobile.map((item) => {
            const active = isActiveHref(pathname, item.href, home);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-ink-soft",
                    active && "text-ink",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                      active && "bg-azure-200",
                    )}
                  >
                    <NavIcon name={item.icon} className="size-5" />
                  </span>
                  <span className="max-w-full truncate px-1">{t(item.shortLabel ?? item.label)}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-ink-soft"
            >
              <span className="flex h-8 w-12 items-center justify-center rounded-full">
                <Menu className="size-5" aria-hidden strokeWidth={1.75} />
              </span>
              {t("more")}
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[85%] max-w-xs gap-0 p-0">
          <SheetHeader className="px-5 pt-6 pb-4">
            <SheetTitle>
              <Logo />
            </SheetTitle>
            <SheetDescription className="sr-only">{tCommon("menu")}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <SidebarNav space={space} onNavigate={() => setOpen(false)} />
          </div>
          <div className="p-4">
            <InstallCard />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
