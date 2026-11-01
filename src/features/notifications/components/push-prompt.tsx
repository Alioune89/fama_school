"use client";

import { useState, useSyncExternalStore } from "react";
import { BellRing, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { enablePush, pushSupport } from "../push-client";

const DISMISSED_KEY = "fama:push-prompt-dismissed";
const noSubscribe = () => () => {};

/** Proposé tant que ce téléphone n'a pas répondu : sans permission, aucune alerte application fermée. */
function shouldAsk() {
  if (pushSupport() !== "ready" || Notification.permission !== "default") return false;
  try {
    return localStorage.getItem(DISMISSED_KEY) === null;
  } catch {
    return true;
  }
}

/** Invitation à recevoir les alertes sur le téléphone (son, vibration), même application fermée. */
export function PushPrompt() {
  const t = useTranslations("notifications.prompt");
  const ask = useSyncExternalStore(noSubscribe, shouldAsk, () => false);
  const [hidden, setHidden] = useState(false);
  const [pending, setPending] = useState(false);
  if (!ask || hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Navigation privée : l'invitation reviendra, sans gêner.
    }
  };

  async function enable() {
    setPending(true);
    const enabled = await enablePush();
    setPending(false);
    if (enabled) {
      toast.success(t("enabled"));
      setHidden(true);
    } else {
      toast.warning(t("failed"));
    }
  }

  return (
    <section
      aria-label={t("title")}
      className="mb-5 flex items-start gap-3 rounded-xl bg-azure-50 p-4 ring-1 ring-azure-200 sm:items-center"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-azure-700 ring-1 ring-azure-200">
        <BellRing className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{t("title")}</p>
        <p className="text-sm text-ink-soft">{t("body")}</p>
        <Button size="sm" className="mt-2 sm:hidden" onClick={enable} disabled={pending}>
          {t("enable")}
        </Button>
      </div>
      <Button size="sm" className="hidden sm:inline-flex" onClick={enable} disabled={pending}>
        {t("enable")}
      </Button>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("dismiss")}
        className="-m-1 rounded-full p-1 text-ink-soft hover:bg-white hover:text-ink"
      >
        <X className="size-4" aria-hidden />
      </button>
    </section>
  );
}
