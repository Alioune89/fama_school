"use client";

import { useTransition } from "react";
import { Lock, LockOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useMessage } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { setPeriodLock } from "../actions";

/** Verrouiller ou déverrouiller une période, après confirmation. */
export function PeriodLockButton({ periodId, label, locked }: { periodId: string; label: string; locked: boolean }) {
  const t = useTranslations("grades.lock");
  const message = useMessage();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant={locked ? "outline" : "default"}
      disabled={pending}
      className="shrink-0"
      onClick={() => {
        if (!window.confirm(t(locked ? "unlockConfirm" : "lockConfirm", { label }))) return;
        startTransition(async () => {
          const result = await setPeriodLock({ periodId, locked: !locked });
          if (result.ok) toast.success(t(locked ? "unlocked" : "lockedToast", { label }));
          else toast.error(message(result.error));
        });
      }}
    >
      {locked ? <LockOpen aria-hidden /> : <Lock aria-hidden />}
      {t(locked ? "unlock" : "lock", { label })}
    </Button>
  );
}
