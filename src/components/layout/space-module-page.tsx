import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { NAVIGATION, plannedModuleSlugs } from "@/config/navigation";
import { routing } from "@/i18n/routing";
import type { Space } from "@/lib/auth/spaces";
import { ComingSoon } from "./coming-soon";

/** Paramètres statiques des modules annoncés dans le menu mais pas encore livrés. */
export function plannedModuleParams(space: Space) {
  return routing.locales.flatMap((locale) => plannedModuleSlugs(space).map((module) => ({ locale, module })));
}

/** Page « Module en préparation » pour une entrée du menu ; toute autre URL donne une 404. */
export async function SpaceModulePage({ space, module }: { space: Space; module: string[] }) {
  const home = NAVIGATION[space].menu[0]!.href;
  const href = `${home}/${module.join("/")}`;
  const item = [...NAVIGATION[space].menu, ...NAVIGATION[space].other]
    .flatMap((entry) => [entry, ...(entry.children ?? [])])
    .find((entry) => entry.href === href && entry.soon);
  if (!item) notFound();

  const t = await getTranslations("nav");
  return <ComingSoon title={t(item.label)} />;
}
