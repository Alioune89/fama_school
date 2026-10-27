"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const STANDALONE_QUERY = "(display-mode: standalone)";

function subscribeToDisplayMode(onChange: () => void) {
  const query = window.matchMedia(STANDALONE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const noopSubscribe = () => () => {};

/**
 * Carte « Installer l'appli » (la carte promo des maquettes) : propose l'installation
 * de la PWA quand le navigateur le permet, sinon l'astuce iPhone.
 */
export function InstallCard({ className, title }: { className?: string; title?: string }) {
  const t = useTranslations("installCard");
  const standalone = useSyncExternalStore(
    subscribeToDisplayMode,
    () => window.matchMedia(STANDALONE_QUERY).matches,
    () => false,
  );
  const isIos = useSyncExternalStore(
    noopSubscribe,
    () => /iphone|ipad|ipod/i.test(window.navigator.userAgent),
    () => false,
  );
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [justInstalled, setJustInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setJustInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone || justInstalled) return null;

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") setJustInstalled(true);
    setPromptEvent(null);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br from-azure-400 via-azure-600 to-azure-800 p-4 text-white",
        className,
      )}
    >
      <div aria-hidden className="absolute -top-8 -right-10 size-28 rounded-full bg-white/15" />
      <div aria-hidden className="absolute -bottom-12 -left-6 size-28 rounded-full bg-lavender-300/30" />
      <p className="relative text-[15px] leading-snug font-semibold">{title ?? t("title")}</p>
      {promptEvent ? (
        <button
          type="button"
          onClick={install}
          className="relative mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink transition-colors hover:bg-azure-50"
        >
          <Download className="size-4" aria-hidden />
          {t("action")}
        </button>
      ) : (
        isIos && <p className="relative mt-3 text-xs leading-relaxed text-white/90">{t("iosHint")}</p>
      )}
    </div>
  );
}
