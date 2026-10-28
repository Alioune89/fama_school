"use client";

import { useTransition } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { markNotificationsRead } from "../actions";
import type { NotificationItem } from "../queries";

const relative = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

/** « il y a 5 minutes », « hier »… ; null : à l'instant. */
function ago(iso: string): string | null {
  const seconds = Math.round((Date.parse(iso) - Date.now()) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return null;
}

/** La cloche : pastille des non lues, dernières notifications ; un clic ouvre la page concernée et marque lu. */
export function NotificationMenu({ items, unread, className }: { items: NotificationItem[]; unread: number; className: string }) {
  const t = useTranslations("notifications");
  const router = useRouter();
  const [, startTransition] = useTransition();

  function open(item: NotificationItem) {
    startTransition(async () => {
      if (!item.read) await markNotificationsRead({ id: item.id });
      if (item.link) router.push(item.link);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={className} aria-label={unread > 0 ? t("bellUnread", { count: unread }) : t("bell")}>
        <Bell className="size-[18px]" aria-hidden strokeWidth={1.75} />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-danger-500 px-1 text-[11px] leading-5 font-bold text-white ring-2 ring-background"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-3 py-1.5 pr-1.5 pl-4">
          <p className="text-sm font-semibold text-ink">{t("title")}</p>
          {unread > 0 && (
            <DropdownMenuItem
              onClick={() => startTransition(async () => void (await markNotificationsRead({})))}
              className="gap-1 text-xs font-semibold text-azure-700"
            >
              <CheckCheck className="size-3.5" aria-hidden />
              {t("markAllRead")}
            </DropdownMenuItem>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <DropdownMenuGroup className="max-h-[70vh] overflow-y-auto py-1">
            {items.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onClick={() => open(item)}
                className={cn("flex items-start gap-3 rounded-none px-4 py-3", !item.read && "bg-azure-50/70")}
              >
                <span
                  aria-hidden
                  className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.read ? "bg-transparent" : "bg-azure-600")}
                />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm text-ink", !item.read && "font-semibold")}>{item.title}</span>
                  {item.body && <span className="mt-0.5 block text-xs text-ink-soft">{item.body}</span>}
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {item.read
                      ? (ago(item.createdAt) ?? t("justNow"))
                      : t("unreadAgo", { ago: ago(item.createdAt) ?? t("justNow") })}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
