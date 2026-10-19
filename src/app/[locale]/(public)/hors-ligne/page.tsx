import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { EmptyState } from "@/components/layout/empty-state";
import { RetryButton } from "./retry-button";

export const metadata: Metadata = { robots: { index: false } };

/** Page de secours servie par le service worker quand une page n'est pas en cache. */
export default async function OfflinePage() {
  const t = await getTranslations("offline");
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo />
      <EmptyState icon={WifiOff} title={t("pageTitle")} body={t("pageBody")} action={<RetryButton label={t("retry")} />} className="w-full" />
    </main>
  );
}
