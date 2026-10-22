"use client";

import { useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useMessage } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import type { Enums } from "@/lib/supabase/database.types";
import { deleteEvaluation } from "../actions";
import type { Evaluation, Period } from "../queries";
import { EvaluationFormSheet } from "./evaluation-form-sheet";

/** Modifier ou supprimer une évaluation (les notes saisies sont supprimées avec elle). */
export function EvaluationRowActions({
  evaluation,
  context,
  scale,
  periods,
}: {
  evaluation: Evaluation;
  context: string;
  scale: Enums<"grading_scale">;
  periods: Period[];
}) {
  const t = useTranslations("evaluations");
  const message = useMessage();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex shrink-0 items-center">
      <EvaluationFormSheet
        classId={evaluation.classId}
        subjectId={evaluation.subjectId}
        context={context}
        scale={scale}
        periods={periods}
        periodId={evaluation.periodId}
        evaluation={evaluation}
        trigger={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("edit", { title: evaluation.title })}
            title={t("edit", { title: evaluation.title })}
          >
            <Pencil aria-hidden />
          </Button>
        }
      />
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={pending}
        aria-label={t("delete", { title: evaluation.title })}
        title={t("delete", { title: evaluation.title })}
        onClick={() => {
          if (!window.confirm(t("deleteConfirm", { title: evaluation.title }))) return;
          startTransition(async () => {
            const result = await deleteEvaluation({ id: evaluation.id });
            if (result.ok) toast.success(t("deleted"));
            else toast.error(message(result.error));
          });
        }}
      >
        <Trash2 aria-hidden />
      </Button>
    </div>
  );
}
