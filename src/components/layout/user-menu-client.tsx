"use client";

import { ArrowLeftRight, Check, CircleUserRound, Languages, LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/features/auth/actions";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

type Props = {
  fullName: string;
  initials: string;
  roleLabel: string;
  schoolName: string | null;
  profileHref: string | null;
  canSwitchSpace: boolean;
};

export function UserMenuClient({ fullName, initials, roleLabel, schoolName, profileHref, canSwitchSpace }: Props) {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 rounded-full py-1 pr-1 pl-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:pl-3">
        <span className="hidden flex-col items-end leading-tight sm:flex">
          <span className="max-w-44 truncate text-sm font-semibold text-ink">{fullName}</span>
          <span className="max-w-44 truncate text-xs text-muted-foreground">{roleLabel}</span>
        </span>
        <span className="relative inline-flex size-10 items-center justify-center rounded-full bg-lavender-200 text-sm font-bold text-ink">
          {initials}
          <span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-success-500 ring-2 ring-white" aria-hidden />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
            <span className="truncate text-sm font-semibold text-ink">{fullName}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {schoolName ? `${roleLabel} · ${schoolName}` : roleLabel}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {profileHref && (
            <DropdownMenuItem onClick={() => router.push(profileHref)}>
              <CircleUserRound aria-hidden />
              {t("profile")}
            </DropdownMenuItem>
          )}
          {canSwitchSpace && (
            <DropdownMenuItem onClick={() => router.push("/choisir-espace")}>
              <ArrowLeftRight aria-hidden />
              {t("switchSpace")}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
            <Languages className="size-3.5" aria-hidden />
            {t("language")}
          </DropdownMenuLabel>
          {routing.locales.map((option) => (
            <DropdownMenuItem key={option} onClick={() => router.replace(pathname, { locale: option })}>
              <Check className={option === locale ? "opacity-100" : "opacity-0"} aria-hidden />
              {t(`languages.${option}`)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => signOut(locale)}>
          <LogOut aria-hidden />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
