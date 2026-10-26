"use client";

import { useTransition } from "react";
import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useMessage } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { addDefaultFeeTypes, deleteFeeType } from "../actions";
import type { FeeType } from "../queries";
import { FeeTypeSheet } from "./fee-type-sheet";

/** Types de frais de l'école, avec ajout, modification et suppression. */
export function FeeTypesList({ feeTypes, canEdit }: { feeTypes: FeeType[]; canEdit: boolean }) {
  const t = useTranslations("fees");
  const message = useMessage();
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(success);
      else toast.error(message(result.error));
    });

  return (
    <section aria-labelledby="fee-types" className="space-y-3 rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="fee-types" className="text-lg font-semibold">
            {t("typesTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("typesHint")}</p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {feeTypes.length === 0 && (
              <Button variant="outline" disabled={pending} onClick={() => run(addDefaultFeeTypes, t("defaultsAdded"))}>
                <Sparkles aria-hidden />
                {t("addDefaults")}
              </Button>
            )}
            <FeeTypeSheet
              trigger={
                <Button>
                  <Plus aria-hidden />
                  {t("newType")}
                </Button>
              }
            />
          </div>
        )}
      </div>

      {feeTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("typesEmpty")}</p>
      ) : (
        <ul className="divide-y divide-line" aria-label={t("typesTitle")}>
          {feeTypes.map((feeType) => (
            <li key={feeType.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
              <span className="min-w-0 flex-1 font-medium text-ink">{feeType.name}</span>
              <span className="rounded-full bg-azure-50 px-2.5 py-0.5 text-xs font-semibold text-azure-700">
                {t(`frequencies.${feeType.frequency}`)}
              </span>
              {feeType.optional && (
                <span className="rounded-full bg-lavender-50 px-2.5 py-0.5 text-xs font-semibold text-lavender-700">
                  {t("optionalBadge")}
                </span>
              )}
              {canEdit && (
                <span className="flex">
                  <FeeTypeSheet
                    feeType={feeType}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("editFor", { name: feeType.name })}
                        title={t("editFor", { name: feeType.name })}
                      >
                        <Pencil aria-hidden />
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={pending}
                    aria-label={t("deleteFor", { name: feeType.name })}
                    title={t("deleteFor", { name: feeType.name })}
                    onClick={() => {
                      if (!window.confirm(t("deleteConfirm", { name: feeType.name }))) return;
                      run(() => deleteFeeType({ id: feeType.id }), t("typeDeleted"));
                    }}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
