import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteView } from "@/features/school-site/components/public-site";
import { getPublishedSite, getSitePreview } from "@/features/school-site/queries";

type Props = PageProps<"/[locale]/ecoles/[slug]">;

const SLUG = /^[a-z0-9-]{1,80}$/;

/** Aperçu (?apercu=1) : site non publié visible du personnel de l'école connecté ; sinon le site publié, en cache. */
async function loadSite({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  if (!SLUG.test(slug)) return { site: null, preview: false };
  const preview = query.apercu === "1";
  return { site: preview ? await getSitePreview(slug) : await getPublishedSite(slug), preview };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { site, preview } = await loadSite(props);
  if (!site) return { robots: { index: false } };
  return {
    title: { absolute: site.city ? `${site.name} · ${site.city}` : site.name },
    description: site.tagline ?? undefined,
    robots: preview ? { index: false } : undefined,
    openGraph: { title: site.name, description: site.tagline ?? undefined, images: site.heroUrl ? [site.heroUrl] : undefined },
  };
}

async function Site(props: Props) {
  const { site, preview } = await loadSite(props);
  if (!site) notFound();
  return <PublicSiteView site={site} preview={preview} />;
}

/** Site vitrine public d'une école : /ecoles/<école>. */
export default function SchoolSitePage(props: Props) {
  return (
    <Suspense fallback={<div className="min-h-dvh animate-pulse bg-azure-50/40" aria-hidden />}>
      <Site {...props} />
    </Suspense>
  );
}
