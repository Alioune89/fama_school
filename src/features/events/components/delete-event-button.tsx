"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useMessage } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { deleteEvent } from "../actions";

export function DeleteEventButton({ id, label }: { id: string; label: string }) {
  const t = useTranslations("events");
  const message = useMessage();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      aria-label={t("deleteFor", { label })}
      title={t("deleteFor", { label })}
      onClick={() => {
        if (!window.confirm(t("deleteConfirm", { label }))) return;
        startTransition(async () => {
          const result = await deleteEvent({ id });
          if (result.ok) toast.success(t("deleted"));
          else toast.error(message(result.error));
        });
      }}
    >
      <Trash2 aria-hidden />
    </Button>
  );
}
