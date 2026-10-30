"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import type { Enums } from "@/lib/supabase/database.types";
import { updateSchoolPlan } from "../actions";
import { SCHOOL_PLANS, SCHOOL_STATUSES } from "../schemas";

/** Formule et statut d'une école, modifiables par l'équipe Fama School. */
export function SchoolPlanForm({
  schoolId,
  schoolName,
  plan: initialPlan,
  status: initialStatus,
}: {
  schoolId: string;
  schoolName: string;
  plan: Enums<"school_plan">;
  status: Enums<"school_status">;
}) {
  const t = useTranslations("platform");
  const [plan, setPlan] = useState(initialPlan);
  const [status, setStatus] = useState(initialStatus);
  const form = useActionForm(updateSchoolPlan, { onSuccess: () => toast.success(t("plansPage.saved", { school: schoolName })) });
  const changed = plan !== initialPlan || status !== initialStatus;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect
          aria-label={t("plansPage.planOf", { school: schoolName })}
          value={plan}
          onChange={(event) => setPlan(event.target.value as Enums<"school_plan">)}
          className="w-44"
        >
          {SCHOOL_PLANS.map((value) => (
            <option key={value} value={value}>
              {t(`plans.${value}`)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label={t("plansPage.statusOf", { school: schoolName })}
          value={status}
          onChange={(event) => setStatus(event.target.value as Enums<"school_status">)}
          className="w-36"
        >
          {SCHOOL_STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`statuses.${value}`)}
            </option>
          ))}
        </NativeSelect>
        <Button type="button" size="sm" disabled={!changed || form.pending} onClick={() => form.run({ schoolId, plan, status })}>
          {t("plansPage.save")}
        </Button>
      </div>
      <FormAlert message={form.formError} />
    </div>
  );
}
