"use client";

import { useTranslations } from "next-intl";
import { dayRanges, type Availability } from "../availability";

const weekday = (day: number) =>
  // 2026-11-02 est un lundi : jour 1 → lundi … 7 → dimanche.
  new Date(Date.UTC(2026, 10, 1 + day)).toLocaleDateString("fr-FR", { weekday: "long", timeZone: "UTC" });
const hour = (time: string) => {
  const [h, m] = time.split(":");
  return m === "00" ? `${Number(h)} h` : `${Number(h)} h ${m}`;
};

/** « Répond du lundi au vendredi, de 8 h à 18 h ». */
export function useAvailabilityText() {
  const t = useTranslations("messages.availability");
  return (availability: Availability) => {
    const days = dayRanges(availability.days)
      .map(([from, to]) => (from === to ? weekday(from) : t("dayRange", { from: weekday(from), to: weekday(to) })))
      .join(", ");
    return t("text", { days, from: hour(availability.startsAt), to: hour(availability.endsAt) });
  };
}
