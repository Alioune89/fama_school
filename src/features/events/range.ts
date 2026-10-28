import { shiftMonth } from "@/lib/domain/fees";

/** Agenda affiché : du début du mois en cours à douze mois plus tard. */
export function agendaRange(today: string) {
  const month = today.slice(0, 7);
  const end = shiftMonth(month, 12);
  return { from: `${month}-01`, to: `${end}-01` };
}
