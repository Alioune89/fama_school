import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowRight, Building2, GraduationCap, House, ShieldCheck, UserRoundSearch } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/layout/empty-state";
import { enterSpace } from "@/features/auth/actions";
import { redirect } from "@/i18n/navigation";
import { spaceEntry } from "@/features/consents/queries";
import { getCurrentUser } from "@/lib/auth/session";
import type { Space } from "@/lib/auth/spaces";
import { formatPhone } from "@/lib/phone";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("spaces");
  return { title: t("chooseTitle") };
}

const SPACE_STYLE: Record<Space, { icon: typeof House; tone: string }> = {
  direction: { icon: Building2, tone: "bg-lavender-200" },
  professeur: { icon: GraduationCap, tone: "bg-azure-200" },
  parent: { icon: House, tone: "bg-sun-200" },
  plateforme: { icon: ShieldCheck, tone: "bg-ink text-white" },
};

async function SpaceList() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) redirect({ href: "/connexion", locale });
  const t = await getTranslations("spaces");
  const tRoles = await getTranslations("roles");

  if (user!.spaces.length === 0) {
    return (
      <EmptyState
        icon={UserRoundSearch}
        title={t("noAccessTitle")}
        body={user!.phone ? t("noAccessBody", { phone: formatPhone(user!.phone) }) : t("noAccessBodyNoPhone")}
      />
    );
  }

  // Un seul espace : on y entre directement.
  if (user!.spaces.length === 1) redirect({ href: await spaceEntry(user!.id, user!.spaces[0]!.space), locale });

  return (
    <section className="rounded-2xl bg-white p-6 shadow-float ring-1 ring-line/70 sm:p-8">
      <h1 className="text-2xl font-bold">{t("chooseTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("chooseSubtitle")}</p>
      <ul className="mt-6 space-y-3">
        {user!.spaces.map((entry) => {
          const { icon: Icon, tone } = SPACE_STYLE[entry.space];
          const subtitle =
            entry.space === "plateforme"
              ? tRoles("platformAdmin")
              : [entry.schoolName, entry.roles.map((role) => tRoles(role)).join(" · ")].filter(Boolean).join(" — ");
          return (
            <li key={`${entry.space}:${entry.schoolId ?? "all"}`}>
              <form action={enterSpace.bind(null, { space: entry.space, schoolId: entry.schoolId, locale })}>
                <button
                  type="submit"
                  className="group flex w-full items-center gap-4 rounded-xl p-3 text-left ring-1 ring-line transition-colors hover:bg-azure-50 hover:ring-azure-300 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-ink ${tone}`}>
                    <Icon className="size-6" aria-hidden strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{t(entry.space)}</span>
                    <span className="block truncate text-sm text-muted-foreground">{subtitle}</span>
                  </span>
                  <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                  <span className="sr-only">{t("enter")}</span>
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SpaceListSkeleton() {
  return (
    <section className="space-y-3 rounded-2xl bg-white p-6 shadow-float ring-1 ring-line/70 sm:p-8" aria-hidden>
      <div className="h-7 w-60 animate-pulse rounded-full bg-muted" />
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="h-[72px] animate-pulse rounded-xl bg-muted" />
      ))}
    </section>
  );
}

export default function ChooseSpacePage() {
  return (
    <Suspense fallback={<SpaceListSkeleton />}>
      <SpaceList />
    </Suspense>
  );
}
