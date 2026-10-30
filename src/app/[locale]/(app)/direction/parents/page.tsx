import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowLeft, Phone, UsersRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { FilterSelect } from "@/components/data/filter-select";
import { SearchInput } from "@/components/data/search-input";
import { StatusPill } from "@/components/dashboard/status-pill";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PersonAvatar } from "@/components/people/person-avatar";
import { buttonVariants } from "@/components/ui/button";
import { countGuardians, listGuardians, type GuardianFilter } from "@/features/guardians/queries";
import { Link } from "@/i18n/navigation";
import { requireSpace } from "@/lib/auth/session";
import { formatPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

type SearchParams = PageProps<"/[locale]/direction/parents">["searchParams"];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guardians");
  return { title: t("title") };
}

const FILTERS: Record<string, GuardianFilter> = { connectes: "connected", "non-connectes": "notConnected" };

/** Adresse publique de l'application, pour le lien d'invitation. */
const appUrl = () => (process.env.APP_URL ?? "https://fama-school.vercel.app").replace(/\/$/, "");

async function Summary() {
  const { entry } = await requireSpace("direction");
  const [{ total, connected }, t] = await Promise.all([countGuardians(entry.schoolId!), getTranslations("guardians")]);
  const rate = total ? Math.round((connected / total) * 100) : 0;
  return (
    <div className="mb-5 rounded-xl bg-white p-5 shadow-card ring-1 ring-line/70">
      <p className="text-sm text-ink-soft">{t("summary", { connected, total })}</p>
      <div
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-azure-50"
        role="progressbar"
        aria-label={t("rateLabel")}
        aria-valuenow={rate}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-azure-500" style={{ width: `${rate}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("rateHint", { rate })}</p>
    </div>
  );
}

async function Guardians({ searchParams }: { searchParams: SearchParams }) {
  const [params, { entry }] = await Promise.all([searchParams, requireSpace("direction")]);
  const q = typeof params.q === "string" ? params.q : undefined;
  const filter = typeof params.statut === "string" ? (FILTERS[params.statut] ?? null) : null;
  const supabase = await createClient();
  const [rows, t, { data: school }] = await Promise.all([
    listGuardians(entry.schoolId!, { q, filter }),
    getTranslations("guardians"),
    supabase.from("schools").select("name").eq("id", entry.schoolId!).single(),
  ]);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={UsersRound}
        title={q || filter ? t("noResults") : t("empty")}
        body={q || filter ? undefined : t("emptyHint")}
      />
    );
  }

  const invitation = t("invitation", { school: school?.name ?? "", url: `${appUrl()}/connexion` });

  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">{t("count", { count: rows.length })}</p>
      <ul className="grid gap-3 lg:grid-cols-2">
        {rows.map((guardian) => (
          <li key={guardian.id} className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70">
            <div className="flex items-start gap-3">
              <PersonAvatar name={guardian.fullName} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{guardian.fullName}</span>
                  <StatusPill tone={guardian.connected ? "success" : "neutral"}>
                    {guardian.connected ? t("connected") : t("notConnected")}
                  </StatusPill>
                </p>
                <p className="tabular text-sm text-muted-foreground">
                  {[guardian.phone ? formatPhone(guardian.phone) : t("noPhone"), guardian.email].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            {guardian.children.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label={t("childrenOf", { name: guardian.fullName })}>
                {guardian.children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/direction/eleves/${child.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-azure-50 px-3 py-1 text-xs font-medium text-ink hover:bg-azure-100"
                    >
                      {child.name}
                      {child.className && <span className="text-muted-foreground">· {child.className}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {guardian.phone && (
              <div className="flex flex-wrap gap-2">
                <a href={`tel:${guardian.phone}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <Phone aria-hidden />
                  {t("call")}
                </a>
                {!guardian.connected && (
                  <a
                    href={`https://wa.me/${guardian.phone.replace(/\D/g, "")}?text=${encodeURIComponent(invitation)}`}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <WhatsAppIcon className="size-4" />
                    {t("invite")}
                  </a>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

async function StatusFilter() {
  const t = await getTranslations("guardians");
  return (
    <FilterSelect
      param="statut"
      label={t("filterLabel")}
      allLabel={t("all")}
      options={[
        { value: "connectes", label: t("connected") },
        { value: "non-connectes", label: t("notConnected") },
      ]}
    />
  );
}

/** Parents de l'école : qui s'est connecté à l'application, leurs enfants, et l'invitation des autres. */
export default async function GuardiansPage({ searchParams }: PageProps<"/[locale]/direction/parents">) {
  const [t, tNav] = await Promise.all([getTranslations("guardians"), getTranslations("nav")]);
  return (
    <>
      <Link href="/direction" className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        {tNav("dashboard")}
      </Link>
      <PageHeader title={t("title")} description={t("hint")} />
      <Suspense fallback={<div className="mb-5 h-24 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Summary />
      </Suspense>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Suspense fallback={<div className="h-11 w-72 rounded-full bg-white shadow-card" aria-hidden />}>
          <SearchInput placeholder={t("searchPlaceholder")} label={t("search")} />
          <StatusFilter />
        </Suspense>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white shadow-card" aria-hidden />}>
        <Guardians searchParams={searchParams} />
      </Suspense>
    </>
  );
}
