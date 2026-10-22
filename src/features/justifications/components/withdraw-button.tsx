"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useMessage } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { withdrawAbsenceJustification } from "../actions";

/** Le parent retire un justificatif encore en attente. */
export function WithdrawButton({ id }: { id: string }) {
  const t = useTranslations("justifications");
  const message = useMessage();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(t("withdrawConfirm"))) return;
        startTransition(async () => {
          const result = await withdrawAbsenceJustification({ id });
          if (result.ok) toast.success(t("withdrawn"));
          else toast.error(message(result.error));
        });
      }}
    >
      {t("withdraw")}
    </Button>
  );
}
