"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useMessage } from "@/components/forms/use-action-form";
import { Switch } from "@/components/ui/switch";
import { setReportCardBlock } from "../actions";

/** Réglage de l'école : bulletins consultables mais non téléchargeables par les familles en retard de paiement. */
export function ReportCardBlockSetting({ enabled, canEdit }: { enabled: boolean; canEdit: boolean }) {
  const t = useTranslations("collections.policy");
  const translate = useMessage();
  const [pending, startTransition] = useTransition();
  const [checked, setChecked] = useOptimistic(enabled);

  function change(next: boolean) {
    startTransition(async () => {
      setChecked(next);
      const result = await setReportCardBlock({ enabled: next });
      if (result.ok) toast.success(t(next ? "enabled" : "disabled"));
      else toast.error(translate(result.error));
    });
  }

  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6">
      <span>
        <span className="block text-base font-semibold text-ink">{t("title")}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{t(canEdit ? "hint" : "hintReadOnly")}</span>
      </span>
      <Switch checked={checked} onCheckedChange={change} disabled={!canEdit || pending} />
    </label>
  );
}
