"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** Ouvre l'impression du navigateur (ou « Enregistrer en PDF »). */
export function PrintButton() {
  const t = useTranslations("arrivals.cardsPage");
  return (
    <Button onClick={() => window.print()}>
      <Printer aria-hidden />
      {t("print")}
    </Button>
  );
}
