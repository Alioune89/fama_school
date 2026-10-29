import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PreregistrationForm } from "@/features/preregistrations/components/preregistration-form";
import { getPreregistrationLevels } from "@/features/preregistrations/queries";
import { getPublishedSite } from "@/features/school-site/queries";
import { Link } from "@/i18n/navigation";

type Props = PageProps<"/[locale]/ecoles/[slug]/preinscription">;

const SLUG = /^[a-z0-9-]{1,80}$/;

async function load({ params }: Props) {
  const { slug } = await params;
  if (!SLUG.test(slug)) return null;
  const [site, levels] = await Promise.all([getPublishedSite(slug), getPreregistrationLevels(slug)]);
  return site ? { site, levels } : null;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [data, t] = await Promise.all([load(props), getTranslations("preregistrations.public")]);
  if (!data) return { robots: { index: false } };
  return { title: { absolute: t("metaTitle", { school: data.site.name }) }, description: t("intro", { school: data.site.name }) };
}

async function Content(props: Props) {
  const [data, t] = await Promise.all([load(props), getTranslations("preregistrations.public")]);
  if (!data) notFound();
  const { site, levels } = data;

  return (
    <div className="min-h-dvh bg-azure-50/40 text-ink" style={{ "--accent": site.accentColor } as React.CSSProperties}>
      <header className="border-b border-line/70 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4 sm:px-6">
          {site.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo servi par le stockage public Supabase
            <img src={site.logoUrl} alt="" className="size-10 rounded-lg object-contain" />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
              <GraduationCap className="size-5" aria-hidden />
            </span>
          )}
          <span className="min-w-0 truncate font-semibold">{site.name}</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href={`/ecoles/${site.slug}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("back")}
        </Link>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-2 mb-8 text-ink-soft">{t("intro", { school: site.name })}</p>
        {levels.length > 0 ? (
          <PreregistrationForm slug={site.slug} schoolName={site.name} levels={levels} />
        ) : (
          <p className="rounded-2xl bg-white p-6 ring-1 ring-line">{t("closed")}</p>
        )}
      </main>
    </div>
  );
}

/** Pré-inscription en ligne d'un enfant : /ecoles/<école>/preinscription. */
export default function PreregistrationPage(props: Props) {
  return (
    <Suspense fallback={<div className="min-h-dvh animate-pulse bg-azure-50/40" aria-hidden />}>
      <Content {...props} />
    </Suspense>
  );
}
