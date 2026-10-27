"use client";

import { useTranslations } from "next-intl";
import { FormAlert } from "@/components/forms/form-alert";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { simulateOnlinePayment } from "../actions";

/** Fournisseur simulé : le parent choisit l'issue, puis revient sur la page de suivi comme après PayDunya. */
export function SimulationPanel({ id }: { id: string }) {
  const t = useTranslations("onlinePayments.simulation");
  const router = useRouter();
  const form = useActionForm(simulateOnlinePayment, {
    onSuccess: () => router.replace(`/parent/paiements/${id}`),
  });
  return (
    <div className="space-y-3">
      <FormAlert message={form.formError} />
      <div className="flex flex-wrap gap-2">
        <Button size="touch" disabled={form.pending} onClick={() => form.run({ id, outcome: "succeeded" })}>
          {t("succeed")}
        </Button>
        <Button size="touch" variant="outline" disabled={form.pending} onClick={() => form.run({ id, outcome: "failed" })}>
          {t("fail")}
        </Button>
        <Button size="touch" variant="ghost" disabled={form.pending} onClick={() => form.run({ id, outcome: "cancelled" })}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
