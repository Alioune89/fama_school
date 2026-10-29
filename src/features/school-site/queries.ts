import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

export type PublicSite = {
  schoolId: string;
  slug: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  published: boolean;
  accentColor: string;
  tagline: string | null;
  about: string | null;
  admissions: string | null;
  heroUrl: string | null;
  stats: { label: string; value: string }[];
  fees: { label: string; amount: number }[];
  faq: { question: string; answer: string }[];
  gallery: string[];
  whatsapp: string | null;
  cycles: { label: string; levels: string[] }[];
  events: { title: string; kind: "holiday" | "exam" | "meeting" | "event"; startsOn: string; endsOn: string }[];
};

type RawSite = Omit<PublicSite, "logoUrl" | "heroUrl" | "gallery"> & {
  logoPath: string | null;
  heroPath: string | null;
  gallery: string[];
};

/** Adresse publique d'un fichier du stockage (logos, photos des sites). */
export function publicFileUrl(bucket: "school-logos" | "school-sites", path: string) {
  return `${getSupabaseEnv().url}/storage/v1/object/public/${bucket}/${path}`;
}

/** Étiquette de cache du site d'une école : invalidée à chaque enregistrement ou publication. */
export const siteTag = (slug: string) => `school-site:${slug}`;

function toSite(raw: RawSite | null): PublicSite | null {
  if (!raw) return null;
  const { logoPath, heroPath, gallery, ...rest } = raw;
  return {
    ...rest,
    logoUrl: logoPath ? publicFileUrl("school-logos", logoPath) : null,
    heroUrl: heroPath ? publicFileUrl("school-sites", heroPath) : null,
    gallery: gallery.map((path) => publicFileUrl("school-sites", path)),
  };
}

/** Site publié d'une école, tel que le voit un visiteur ; mis en cache jusqu'à la prochaine publication. */
export async function getPublishedSite(slug: string): Promise<PublicSite | null> {
  "use cache";
  cacheTag(siteTag(slug));
  // Les événements à venir changent avec les jours : relecture au plus tard chaque heure.
  cacheLife("hours");
  const { data, error } = await createPublicClient().rpc("public_school_site", { p_slug: slug });
  if (error) throw error;
  return toSite(data as RawSite | null);
}

/** Aperçu du site (même non publié) pour le personnel de l'école connecté. */
export async function getSitePreview(slug: string): Promise<PublicSite | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_school_site", { p_slug: slug, p_preview: true });
  if (error) throw error;
  return toSite(data as RawSite | null);
}

export type SiteEditorData = {
  slug: string;
  published: boolean;
  publishedAt: string | null;
  accentColor: string;
  tagline: string;
  about: string;
  admissions: string;
  whatsapp: string;
  stats: { label: string; value: string }[];
  fees: { label: string; amount: number }[];
  faq: { question: string; answer: string }[];
  hero: { path: string; url: string } | null;
  gallery: { path: string; url: string }[];
};

/** Contenu du site à modifier (valeurs par défaut si l'école n'a encore rien rédigé). */
export async function getSiteEditorData(schoolId: string): Promise<SiteEditorData> {
  const supabase = await createClient();
  const [{ data: school, error: schoolError }, { data: site, error }] = await Promise.all([
    supabase.from("schools").select("slug").eq("id", schoolId).single(),
    supabase.from("school_sites").select("*").eq("school_id", schoolId).maybeSingle(),
  ]);
  if (schoolError) throw schoolError;
  if (error) throw error;
  const photo = (path: string) => ({ path, url: publicFileUrl("school-sites", path) });
  return {
    slug: school.slug,
    published: site?.published ?? false,
    publishedAt: site?.published_at ?? null,
    accentColor: site?.accent_color ?? "#1570a6",
    tagline: site?.tagline ?? "",
    about: site?.about ?? "",
    admissions: site?.admissions ?? "",
    whatsapp: site?.whatsapp ?? "",
    stats: (site?.stats as SiteEditorData["stats"] | undefined) ?? [],
    fees: (site?.fees as SiteEditorData["fees"] | undefined) ?? [],
    faq: (site?.faq as SiteEditorData["faq"] | undefined) ?? [],
    hero: site?.hero_path ? photo(site.hero_path) : null,
    gallery: ((site?.gallery as string[] | undefined) ?? []).map(photo),
  };
}
