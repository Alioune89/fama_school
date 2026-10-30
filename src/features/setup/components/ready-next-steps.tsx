import { FileSpreadsheet, GraduationCap, PartyPopper, UserPlus, UsersRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { permissions } from "@/lib/auth/permissions";
import type { AppRole } from "@/lib/auth/spaces";
import { cn } from "@/lib/utils";

/**
 * Fin de la mise en route : l'école est prête, il reste à faire entrer les élèves et l'équipe.
 * Chaque bouton n'apparaît qu'aux rôles qui peuvent s'en servir.
 */
export async function ReadyNextSteps({ roles, className }: { roles: readonly AppRole[]; className?: string }) {
  const t = await getTranslations("setup.ready");
  const actions = [
    permissions.managePeople(roles) && {
      href: "/direction/eleves/importer",
      icon: FileSpreadsheet,
      label: t("import"),
      primary: true,
    },
    permissions.managePeople(roles) && { href: "/direction/eleves", icon: UserPlus, label: t("enroll"), primary: false },
    permissions.inviteRole(roles, "teacher") && {
      href: "/direction/professeurs",
      icon: GraduationCap,
      label: t("teachers"),
      primary: false,
    },
    permissions.manageSchool(roles) && { href: "/direction/personnel", icon: UsersRound, label: t("staff"), primary: false },
  ].filter((action) => action !== false);

  return (
    <section
      aria-labelledby="ready-title"
      className={cn(
        "rounded-xl bg-gradient-to-br from-success-50 via-white to-azure-50 p-6 shadow-card ring-1 ring-line/70",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white text-success-700 ring-1 ring-line">
          <PartyPopper className="size-6" aria-hidden strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 id="ready-title" className="text-lg font-bold">
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{t("body")}</p>
        </div>
      </div>
      {actions.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {actions.map(({ href, icon: Icon, label, primary }) => (
            <Link key={href} href={href} className={buttonVariants({ variant: primary ? "default" : "outline" })}>
              <Icon aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
