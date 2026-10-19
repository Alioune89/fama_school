"use client";

import { useTransition } from "react";
import { UserRoundCheck, UserRoundX } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useMessage } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { setStaffStatus } from "@/features/staff/actions";

export function StaffStatusButton({ id, name, status }: { id: string; name: string; status: "active" | "inactive" }) {
  const t = useTranslations("staff.detail");
  const message = useMessage();
  const [pending, startTransition] = useTransition();
  const next = status === "active" ? "inactive" : "active";

  return (
    <Button
      variant={status === "active" ? "outline" : "secondary"}
      disabled={pending}
      onClick={() => {
        if (next === "inactive" && !window.confirm(t("deactivateConfirm", { name }))) return;
        startTransition(async () => {
          const result = await setStaffStatus({ id, status: next });
          if (result.ok) toast.success(next === "inactive" ? t("deactivated") : t("reactivated"));
          else toast.error(message(result.error));
        });
      }}
    >
      {status === "active" ? <UserRoundX aria-hidden /> : <UserRoundCheck aria-hidden />}
      {status === "active" ? t("deactivate") : t("reactivate")}
    </Button>
  );
}
