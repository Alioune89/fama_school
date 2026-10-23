"use client";

import { useState, useTransition } from "react";
import { Download, Eye, EyeOff, Layers, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useMessage } from "@/components/forms/use-action-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { generateReportCards, publishReportCards } from "../actions";

type Props = {
  classId: string;
  className: string;
  periodId: string;
  /** Toutes les classes de l'école, pour la génération en masse. */
  classes: { id: string; name: string }[];
  generated: number;
  published: number;
  rosterSize: number;
};

/**
 * Génération, publication et impression des bulletins d'une classe, et génération pour toutes
 * les classes de l'école avec suivi de progression (une classe après l'autre).
 */
export function ReportCardsPanel({ classId, className, periodId, classes, generated, published, rosterSize }: Props) {
  const t = useTranslations("reportCardsAdmin");
  const message = useMessage();
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<{ done: number; current: string } | null>(null);

  function generate() {
    startTransition(async () => {
      const result = await generateReportCards({ classId, periodId });
      if (result.ok) toast.success(t("generated", { count: result.data.count }));
      else toast.error(message(result.error));
    });
  }

  function generateAll() {
    startTransition(async () => {
      let total = 0;
      for (const [index, klass] of classes.entries()) {
        setProgress({ done: index, current: klass.name });
        const result = await generateReportCards({ classId: klass.id, periodId });
        if (!result.ok) {
          setProgress(null);
          toast.error(t("generateAllFailed", { className: klass.name, error: message(result.error) ?? "" }));
          return;
        }
        total += result.data.count;
      }
      setProgress(null);
      toast.success(t("generatedAll", { count: total, classes: classes.length }));
    });
  }

  function publish(value: boolean) {
    if (!value && !window.confirm(t("unpublishConfirm", { className }))) return;
    startTransition(async () => {
      const result = await publishReportCards({ classId, periodId, published: value });
      if (result.ok) toast.success(t(value ? "publishedToast" : "unpublishedToast", { className }));
      else toast.error(message(result.error));
    });
  }

  return (
    <div className="space-y-3 rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70 sm:p-5">
      <p className="text-sm text-ink-soft" aria-live="polite">
        {progress
          ? t("progress", { done: progress.done, total: classes.length, className: progress.current })
          : t("status", { generated, rosterSize, published })}
      </p>
      {progress && (
        <div className="h-2 overflow-hidden rounded-full bg-azure-50" aria-hidden>
          <div
            className="h-full rounded-full bg-azure-500 transition-all"
            style={{ width: `${(progress.done / classes.length) * 100}%` }}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={generate} disabled={pending || rosterSize === 0}>
          <RefreshCw aria-hidden />
          {generated > 0 ? t("regenerate") : t("generate")}
        </Button>
        {classes.length > 1 && (
          <Button variant="outline" onClick={generateAll} disabled={pending}>
            <Layers aria-hidden />
            {t("generateAll", { count: classes.length })}
          </Button>
        )}
        {generated > 0 &&
          (published < generated ? (
            <Button variant="outline" onClick={() => publish(true)} disabled={pending}>
              <Eye aria-hidden />
              {t("publish")}
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => publish(false)} disabled={pending}>
              <EyeOff aria-hidden />
              {t("unpublish")}
            </Button>
          ))}
        {generated > 0 && (
          <a
            href={`/api/bulletins?classe=${classId}&periode=${periodId}`}
            className={buttonVariants({ variant: "outline" })}
            download
          >
            <Download aria-hidden />
            {t("downloadClass")}
          </a>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t("regenerateHint")}</p>
    </div>
  );
}
