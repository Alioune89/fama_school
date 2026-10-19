import { useTranslations } from "next-intl";
import { StatusPill } from "@/components/dashboard/status-pill";
import type { Enums } from "@/lib/supabase/database.types";

export function ContractPill({ contract }: { contract: Enums<"staff_contract"> | null }) {
  const t = useTranslations("staff");
  if (!contract) return null;
  return <StatusPill tone={contract === "permanent" ? "info" : "lavender"}>{t(`contracts.${contract}`)}</StatusPill>;
}

/** Compte relié (la personne s'est déjà connectée) ou invitation en attente ; fiche désactivée. */
export function AccountPill({ linked, status }: { linked: boolean; status: Enums<"person_status"> }) {
  const t = useTranslations("staff");
  if (status === "inactive") return <StatusPill tone="neutral">{t("account.inactive")}</StatusPill>;
  return linked ? <StatusPill tone="success">{t("account.active")}</StatusPill> : <StatusPill tone="warning">{t("account.invited")}</StatusPill>;
}
