"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/auth/permissions";
import { getSchoolContext } from "@/lib/auth/school-context";
import { createClient } from "@/lib/supabase/server";
import { siteTag } from "./queries";
import { SITE_LIMITS, siteSchema, type SiteInput } from "./schemas";

async function context() {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.publish(ctx.roles)) return null;
  const supabase = await createClient();
  const { data: school } = await supabase.from("schools").select("slug").eq("id", ctx.schoolId).single();
  if (!school) return null;
  return { schoolId: ctx.schoolId, slug: school.slug, supabase };
}

type Context = NonNullable<Awaited<ReturnType<typeof context>>>;

/** Le site public se met à jour dès l'enregistrement, et la page de l'éditeur aussi. */
function invalidate(ctx: Context) {
  updateTag(siteTag(ctx.slug));
  refresh();
}

/** Enregistre le contenu du site (publié ou non). */
export async function saveSite(input: SiteInput): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return fail("errors.forbidden");
  const parsed = siteSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const { error } = await ctx.supabase.from("school_sites").upsert({
    school_id: ctx.schoolId,
    tagline: v.tagline,
    about: v.about,
    admissions: v.admissions,
    accent_color: v.accentColor,
    whatsapp: v.whatsapp,
    stats: v.stats,
    fees: v.fees,
    faq: v.faq,
    updated_at: new Date().toISOString(),
  });
  if (error) return fail(error.code === "23514" ? "schoolSite.errors.tooLong" : "errors.unknown");
  invalidate(ctx);
  return ok(undefined);
}

/** Met le site en ligne, ou le retire. */
export async function setSitePublished(input: { published: boolean }): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return fail("errors.forbidden");
  const parsed = z.object({ published: z.boolean() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { published } = parsed.data;
  const { error } = await ctx.supabase.from("school_sites").upsert({
    school_id: ctx.schoolId,
    published,
    ...(published && { published_at: new Date().toISOString() }),
  });
  if (error) return fail("errors.unknown");
  invalidate(ctx);
  return ok(undefined);
}

const photoSchema = z.object({
  kind: z.enum(["hero", "gallery"]),
  path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/),
});

/** Enregistre une photo déjà envoyée dans le stockage (photo principale ou galerie). */
export async function addSitePhoto(input: z.input<typeof photoSchema>): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return fail("errors.forbidden");
  const parsed = photoSchema.safeParse(input);
  if (!parsed.success || !parsed.data.path.startsWith(`${ctx.schoolId}/`)) return fail("errors.forbidden");
  const { kind, path } = parsed.data;

  const { data: site } = await ctx.supabase
    .from("school_sites")
    .select("hero_path, gallery")
    .eq("school_id", ctx.schoolId)
    .maybeSingle();
  const gallery = (site?.gallery as string[] | undefined) ?? [];
  if (kind === "gallery" && gallery.length >= SITE_LIMITS.gallery) return fail("schoolSite.errors.galleryFull");

  const { error } = await ctx.supabase
    .from("school_sites")
    .upsert(
      kind === "hero" ? { school_id: ctx.schoolId, hero_path: path } : { school_id: ctx.schoolId, gallery: [...gallery, path] },
    );
  if (error) return fail("errors.unknown");
  if (kind === "hero" && site?.hero_path) await ctx.supabase.storage.from("school-sites").remove([site.hero_path]);
  invalidate(ctx);
  return ok(undefined);
}

/** Retire une photo du site et la supprime du stockage. */
export async function removeSitePhoto(input: { path: string }): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return fail("errors.forbidden");
  const parsed = z.object({ path: z.string().min(1).max(300) }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { path } = parsed.data;

  const { data: site } = await ctx.supabase
    .from("school_sites")
    .select("hero_path, gallery")
    .eq("school_id", ctx.schoolId)
    .maybeSingle();
  if (!site) return fail("errors.notFound");
  const gallery = site.gallery as string[];
  if (site.hero_path !== path && !gallery.includes(path)) return fail("errors.notFound");

  const { error } = await ctx.supabase
    .from("school_sites")
    .update(site.hero_path === path ? { hero_path: null } : { gallery: gallery.filter((p) => p !== path) })
    .eq("school_id", ctx.schoolId);
  if (error) return fail("errors.unknown");
  await ctx.supabase.storage.from("school-sites").remove([path]);
  invalidate(ctx);
  return ok(undefined);
}
