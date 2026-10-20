"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useMessage } from "@/components/forms/use-action-form";
import { NativeSelect } from "@/components/ui/native-select";
import { setDemoRequestStatus } from "@/features/platform/actions";
import { Constants, type Enums } from "@/lib/supabase/database.types";

export function DemoStatusSelect({ id, name, status }: { id: string; name: string; status: Enums<"demo_request_status"> }) {
  const t = useTranslations("platform.demoRequests");
  const message = useMessage();
  const [pending, startTransition] = useTransition();

  return (
    <NativeSelect
      aria-label={t("statusFor", { name })}
      value={status}
      disabled={pending}
      onChange={(event) => {
        const next = event.target.value as Enums<"demo_request_status">;
        startTransition(async () => {
          const result = await setDemoRequestStatus({ id, status: next });
          if (result.ok) toast.success(t("updated"));
          else toast.error(message(result.error));
        });
      }}
      className="min-w-36"
    >
      {Constants.public.Enums.demo_request_status.map((value) => (
        <option key={value} value={value}>
          {t(`statuses.${value}`)}
        </option>
      ))}
    </NativeSelect>
  );
}
