"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("errorPage");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-lg items-center px-4 py-12">
      <EmptyState
        icon={TriangleAlert}
        title={t("title")}
        body={t("body")}
        action={<Button onClick={() => retry()}>{t("retry")}</Button>}
        className="w-full"
      />
    </main>
  );
}
