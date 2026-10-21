"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useUrlParams } from "@/components/data/use-url-params";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { shiftDay } from "../report";

/** Choix du jour affiché (paramètre « date » de l'adresse) : jour précédent, suivant, ou calendrier. */
export function DayNav({ date, today }: { date: string; today: string }) {
  const t = useTranslations("attendance.direction");
  const setParams = useUrlParams();
  const go = (value: string) => setParams({ date: value && value !== today ? value : null });

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" aria-label={t("previousDay")} onClick={() => go(shiftDay(date, -1))}>
        <ChevronLeft aria-hidden />
      </Button>
      <Input
        type="date"
        aria-label={t("chooseDay")}
        value={date}
        max={today}
        onChange={(event) => go(event.target.value)}
        className="w-44"
      />
      <Button
        variant="outline"
        size="icon"
        aria-label={t("nextDay")}
        disabled={date >= today}
        onClick={() => go(shiftDay(date, 1))}
      >
        <ChevronRight aria-hidden />
      </Button>
      {date !== today && (
        <Button variant="ghost" onClick={() => go(today)}>
          {t("today")}
        </Button>
      )}
    </div>
  );
}
