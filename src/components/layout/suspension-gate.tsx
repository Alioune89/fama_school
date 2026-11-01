import type { ReactNode } from "react";
import { PauseCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { buttonVariants } from "@/components/ui/button";
import { whatsappLink } from "@/config/contact";
import { requireSpace } from "@/lib/auth/session";
import type { Space } from "@/lib/auth/spaces";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "./empty-state";

/**
 * École suspendue par l'équipe Fama School (abonnement à régulariser) : l'espace n'est plus rendu, les données
 * restent conservées. Un parent garde l'accès tant qu'un de ses enfants est dans une école active.
 */
export async function SuspensionGate({ space, children }: { space: Exclude<Space, "plateforme">; children: ReactNode }) {
  const { user, entry } = await requireSpace(space);
  const schoolIds =
    space === "parent"
      ? [...new Set(user.memberships.filter((m) => m.role === "parent").map((m) => m.schoolId))]
      : [entry.schoolId!];

  const supabase = await createClient();
  const { data } = await supabase.from("schools").select("name, status").in("id", schoolIds);
  const schools = data ?? [];
  if (schools.length === 0 || schools.some((school) => school.status !== "suspended")) return children;

  const t = await getTranslations("suspended");
  const names = schools.map((school) => school.name).join(", ");
  return (
    <EmptyState
      icon={PauseCircle}
      title={t("title")}
      body={t(space === "parent" ? "bodyParent" : "body", { school: names })}
      action={
        <a
          href={whatsappLink(t("whatsapp", { school: names }))}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "outline" })}
        >
          <WhatsAppIcon className="size-4" />
          {t("contact")}
        </a>
      }
    />
  );
}
