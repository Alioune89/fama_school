"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useMessage } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { renewStudentBadge } from "../actions";

export function RenewBadgeButton({ studentId }: { studentId: string }) {
  const t = useTranslations("arrivals.badge");
  const message = useMessage();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(t("renewConfirm"))) return;
        startTransition(async () => {
          const result = await renewStudentBadge({ studentId });
          if (result.ok) toast.success(t("renewed"));
          else toast.error(message(result.error));
        });
      }}
    >
      <RefreshCw aria-hidden />
      {t("renew")}
    </Button>
  );
}
