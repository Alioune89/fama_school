"use client";

import { useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOffline } from "next/offline";
import { toast } from "sonner";
import { useMessage } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { publishEvaluation } from "../../evaluations/actions";

/**
 * Publier les notes aux parents. Il faut le réseau, et une feuille enregistrée et envoyée :
 * les parents voient ce que le serveur a reçu.
 */
export function PublishButton({
  evaluationId,
  publishedAt,
  synced,
  hasGrades,
}: {
  evaluationId: string;
  publishedAt: string | null;
  synced: boolean;
  hasGrades: boolean;
}) {
  const t = useTranslations("grades");
  const message = useMessage();
  const isOffline = useOffline();
  const [pending, startTransition] = useTransition();

  function run(published: boolean) {
    if (!published && !window.confirm(t("unpublishConfirm"))) return;
    startTransition(async () => {
      const result = await publishEvaluation({ id: evaluationId, published });
      if (result.ok) toast.success(t(published ? "publishedToast" : "unpublishedToast"));
      else toast.error(message(result.error));
    });
  }

  if (publishedAt) {
    return (
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-3 py-1 text-xs font-semibold text-success-700">
          <Eye className="size-3.5" aria-hidden />
          {t("published", { date: formatDate(publishedAt, { day: "numeric", month: "long" }) })}
        </p>
        <Button variant="ghost" size="sm" disabled={pending || isOffline} onClick={() => run(false)}>
          <EyeOff aria-hidden />
          {t("unpublish")}
        </Button>
      </div>
    );
  }

  const hint = isOffline ? t("publishOffline") : !hasGrades || !synced ? t("publishNeedsSave") : t("publishHint");
  return (
    <div className="flex flex-col items-start gap-1.5 sm:max-w-56 sm:items-end">
      <Button variant="outline" disabled={pending || isOffline || !synced || !hasGrades} onClick={() => run(true)}>
        <Eye aria-hidden />
        {t("publish")}
      </Button>
      <p className="text-xs text-muted-foreground sm:text-right">{hint}</p>
    </div>
  );
}
