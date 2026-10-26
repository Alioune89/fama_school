import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

/** Entrée de la rubrique Finances : la grille des frais, en attendant le tableau des encaissements (Lot 4.5). */
export default async function FinancesPage() {
  redirect({ href: "/direction/finances/frais", locale: await getLocale() });
}
