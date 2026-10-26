"use client";

import { useState, useTransition } from "react";
import { FilePlus2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useMessage } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { issueInvoices } from "../actions";

const monthLabel = (month: string) =>
  new Date(`${month}-01T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * Émission des factures : les mensualités d'un mois, ou les frais annuels, pour tous les élèves inscrits.
 * Sans doublon : les élèves déjà facturés pour ce mois sont ignorés.
 */
export function IssueInvoicesSheet({ yearId, months, defaultMonth }: { yearId: string; months: string[]; defaultMonth: string }) {
  const t = useTranslations("invoices");
  const message = useMessage();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>(defaultMonth);
  const [pending, startTransition] = useTransition();

  function issue() {
    startTransition(async () => {
      const result = await issueInvoices({ yearId, month: target === "annual" ? null : target });
      if (!result.ok) {
        toast.error(message(result.error));
        return;
      }
      toast.success(t("issued", { count: result.data.count }));
      setOpen(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button>
            <FilePlus2 aria-hidden />
            {t("issue")}
          </Button>
        }
      />
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-line px-6 py-5">
          <SheetTitle className="text-lg font-bold">{t("issue")}</SheetTitle>
          <SheetDescription>{t("issueHint")}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-5 px-6 py-5">
          <label className="grid gap-1.5 text-sm font-medium">
            {t("issueWhat")}
            <NativeSelect value={target} onChange={(event) => setTarget(event.target.value)}>
              {months.map((month) => (
                <option key={month} value={month}>
                  {t("monthly", { month: monthLabel(month) })}
                </option>
              ))}
              <option value="annual">{t("annual")}</option>
            </NativeSelect>
          </label>
          <p className="text-sm text-muted-foreground">{t("issueNoDuplicate")}</p>
          <div className="mt-auto flex gap-3 pt-2">
            <Button size="lg" className="flex-1" onClick={issue} disabled={pending}>
              {t("issueSubmit")}
            </Button>
            <Button size="lg" variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
