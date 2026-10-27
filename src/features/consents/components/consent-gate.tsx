import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/session";
import { getMyConsents } from "../queries";

/** Espace parent : tant que le traitement des données n'est pas accepté, direction la page de bienvenue. */
export async function ConsentGate() {
  const user = await requireUser();
  const { decided } = await getMyConsents(user.id);
  if (!decided) redirect({ href: "/bienvenue", locale: await getLocale() });
  return null;
}
