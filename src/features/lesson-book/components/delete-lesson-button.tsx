"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useMessage } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { deleteLesson } from "../actions";

export function DeleteLessonButton({ id, date }: { id: string; date: string }) {
  const t = useTranslations("lessonBook");
  const message = useMessage();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      aria-label={t("deleteFor", { date })}
      onClick={() => {
        if (!window.confirm(t("deleteConfirm", { date }))) return;
        startTransition(async () => {
          const result = await deleteLesson({ id });
          if (result.ok) toast.success(t("deleted"));
          else toast.error(message(result.error));
        });
      }}
    >
      <Trash2 aria-hidden />
    </Button>
  );
}
