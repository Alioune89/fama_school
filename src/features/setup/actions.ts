"use server";

import { refresh } from "next/cache";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/auth/permissions";
import { getSchoolContext } from "@/lib/auth/school-context";
import { parseSchoolSettings } from "@/lib/domain/school-settings";
import { CYCLE_PRESETS, classNames, expandLevels } from "@/lib/domain/senegal-presets";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import {
  academicYearSchema,
  classesSchema,
  evaluationSchema,
  levelsSchema,
  schoolIdentitySchema,
  subjectsSchema,
  type AcademicYearInput,
  type ClassesInput,
  type EvaluationInput,
  type LevelsInput,
  type SchoolIdentityInput,
  type SubjectsInput,
} from "./schemas";

type Permission = "manageSchool" | "manageAcademics";

async function context(permission: Permission) {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions[permission](ctx.roles)) return null;
  return { ...ctx, supabase: await createClient() };
}

async function mergeSettings(supabase: Awaited<ReturnType<typeof createClient>>, schoolId: string, patch: Record<string, unknown>) {
  const { data } = await supabase.from("schools").select("settings").eq("id", schoolId).single();
  const current = (data?.settings ?? {}) as Record<string, unknown>;
  return supabase
    .from("schools")
    .update({ settings: { ...current, ...patch } as { [key: string]: Json } })
    .eq("id", schoolId);
}

/** Étape 1 — identité de l'école. */
export async function saveSchoolIdentity(input: SchoolIdentityInput): Promise<ActionResult> {
  const ctx = await context("manageSchool");
  if (!ctx) return fail("errors.forbidden");
  const parsed = schoolIdentitySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  const { error } = await ctx.supabase
    .from("schools")
    .update({ name: v.name, short_name: v.shortName, city: v.city, region: v.region, address: v.address, phone: v.phone, email: v.email })
    .eq("id", ctx.schoolId);
  if (error) return fail("errors.unknown");
  refresh();
  return ok(undefined);
}

const LOGO_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg" };

/** Logo de l'école (affiché sur les bulletins, les reçus et le mini-site). */
export async function uploadSchoolLogo(formData: FormData): Promise<ActionResult<{ path: string }>> {
  const ctx = await context("manageSchool");
  if (!ctx) return fail("errors.forbidden");
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return fail("validation.required");
  const extension = LOGO_TYPES[file.type];
  if (!extension) return fail("setup.errors.logoType");
  if (file.size > 1024 * 1024) return fail("setup.errors.logoSize");

  const path = `${ctx.schoolId}/logo-${Date.now()}.${extension}`;
  const { error: uploadError } = await ctx.supabase.storage.from("school-logos").upload(path, file, { contentType: file.type });
  if (uploadError) return fail("errors.unknown");

  const { data: previous } = await ctx.supabase.from("schools").select("logo_path").eq("id", ctx.schoolId).single();
  const { error } = await ctx.supabase.from("schools").update({ logo_path: path }).eq("id", ctx.schoolId);
  if (error) return fail("errors.unknown");
  if (previous?.logo_path) await ctx.supabase.storage.from("school-logos").remove([previous.logo_path]);

  refresh();
  return ok({ path });
}

/** Étape 2 — année scolaire et périodes. */
export async function saveAcademicYear(input: AcademicYearInput): Promise<ActionResult> {
  const ctx = await context("manageAcademics");
  if (!ctx) return fail("errors.forbidden");
  const parsed = academicYearSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const { supabase, schoolId } = ctx;

  const { data: existing } = await supabase
    .from("academic_years")
    .select("id, periods(id, position, locked_at)")
    .eq("school_id", schoolId)
    .eq("label", v.label)
    .maybeSingle();

  if (existing?.periods?.some((period) => period.locked_at)) return fail("setup.errors.periodLocked");

  // Une seule année « en cours » par école.
  await supabase.from("academic_years").update({ is_current: false }).eq("school_id", schoolId).neq("label", v.label);

  const { data: year, error } = await supabase
    .from("academic_years")
    .upsert(
      { school_id: schoolId, label: v.label, starts_on: v.startsOn, ends_on: v.endsOn, period_kind: v.periodKind, is_current: true },
      { onConflict: "school_id,label" },
    )
    .select("id")
    .single();
  if (error || !year) return fail("errors.unknown");

  const { error: periodsError } = await supabase.from("periods").upsert(
    v.periods.map((period) => ({
      school_id: schoolId,
      academic_year_id: year.id,
      position: period.position,
      label: period.label,
      starts_on: period.startsOn,
      ends_on: period.endsOn,
    })),
    { onConflict: "academic_year_id,position" },
  );
  if (periodsError) return fail("errors.unknown");

  await supabase.from("periods").delete().eq("academic_year_id", year.id).gt("position", v.periods.length);

  refresh();
  return ok(undefined);
}

/** Étape 3 — cycles et niveaux (préréglages sénégalais). */
export async function saveLevels(input: LevelsInput): Promise<ActionResult> {
  const ctx = await context("manageAcademics");
  if (!ctx) return fail("errors.forbidden");
  const parsed = levelsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const { supabase, schoolId } = ctx;

  const selected = CYCLE_PRESETS.filter((cycle) => v.cycles.includes(cycle.code));
  const { data: cycles, error: cyclesError } = await supabase
    .from("cycles")
    .upsert(
      selected.map((cycle, index) => ({
        school_id: schoolId,
        code: cycle.code,
        label: cycle.label,
        grading_scale: cycle.gradingScale,
        position: index + 1,
      })),
      { onConflict: "school_id,code" },
    )
    .select("id, code");
  if (cyclesError || !cycles) return fail("errors.unknown");

  const { data: existingLevels } = await supabase.from("levels").select("id, code, series").eq("school_id", schoolId);
  const levelKey = (code: string, series: string | null | undefined) => `${code}|${series ?? ""}`;
  const existingKeys = new Map((existingLevels ?? []).map((level) => [levelKey(level.code, level.series), level.id]));

  const wanted = selected.flatMap((cycle) =>
    expandLevels(cycle.code, cycle.code === "secondaire" ? v.series : undefined).map((level) => ({
      cycleId: cycles.find((row) => row.code === cycle.code)!.id,
      level,
    })),
  );

  let position = 0;
  const toInsert = [];
  const toUpdate = [];
  for (const { cycleId, level } of wanted) {
    position += 1;
    const id = existingKeys.get(levelKey(level.code, level.series));
    const row = {
      school_id: schoolId,
      cycle_id: cycleId,
      code: level.code,
      label: level.series ? `${level.label} ${level.series}` : level.label,
      series: level.series ?? null,
      exam: level.exam ?? null,
      position,
    };
    if (id) toUpdate.push({ id, ...row });
    else toInsert.push(row);
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("levels").insert(toInsert);
    if (error) return fail("errors.unknown");
  }
  await Promise.all(
    toUpdate.map((row) => supabase.from("levels").update({ position: row.position, label: row.label, exam: row.exam }).eq("id", row.id)),
  );

  // Niveaux et cycles retirés : refusé s'ils ont déjà des classes.
  const wantedKeys = new Set(wanted.map(({ level }) => levelKey(level.code, level.series)));
  const removedLevelIds = (existingLevels ?? []).filter((level) => !wantedKeys.has(levelKey(level.code, level.series))).map((level) => level.id);
  if (removedLevelIds.length > 0) {
    const { error } = await supabase.from("levels").delete().in("id", removedLevelIds);
    if (error) return fail(error.code === "23503" ? "setup.errors.levelInUse" : "errors.unknown");
  }
  const { error: cycleDeleteError } = await supabase
    .from("cycles")
    .delete()
    .eq("school_id", schoolId)
    .not("code", "in", `(${v.cycles.join(",")})`);
  if (cycleDeleteError) return fail(cycleDeleteError.code === "23503" ? "setup.errors.levelInUse" : "errors.unknown");

  if (permissions.manageSchool(ctx.roles)) await mergeSettings(supabase, schoolId, { francoArabic: v.francoArabic });

  refresh();
  return ok(undefined);
}

/** Étape 4 — matières et coefficients par niveau. */
export async function saveSubjects(input: SubjectsInput): Promise<ActionResult> {
  const ctx = await context("manageAcademics");
  if (!ctx) return fail("errors.forbidden");
  const parsed = subjectsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { rows, removedIds } = parsed.data;
  const { supabase, schoolId } = ctx;

  if (removedIds.length > 0) {
    const { error } = await supabase.from("subjects").delete().eq("school_id", schoolId).in("id", removedIds);
    if (error) return fail("errors.unknown");
  }

  const { data: saved, error } = await supabase
    .from("subjects")
    .upsert(
      rows.map((row, index) => ({
        ...(row.id ? { id: row.id } : {}),
        school_id: schoolId,
        name: row.name,
        name_ar: row.nameAr,
        short_name: row.shortName,
        subject_group: row.group,
        track: row.track,
        position: index + 1,
        active: true,
      })),
      { onConflict: "school_id,name" },
    )
    .select("id, name");
  if (error || !saved) return fail(error?.code === "23505" ? "validation.duplicate" : "errors.unknown");

  // La grille complète est remplacée en une seule fois (fonction Postgres atomique).
  const idByName = new Map(saved.map((subject) => [subject.name, subject.id]));
  const grid = rows.flatMap((row) =>
    Object.entries(row.coefficients)
      .filter((entry): entry is [string, number] => entry[1] !== null)
      .map(([levelId, coefficient]) => ({ level_id: levelId, subject_id: idByName.get(row.name)!, coefficient })),
  );

  const { error: gridError } = await supabase.rpc("replace_level_subjects", { p_school_id: schoolId, p_rows: grid });
  if (gridError) return fail("errors.unknown");

  refresh();
  return ok(undefined);
}

/** Étape 5 — création des classes de l'année en cours (les classes existantes sont conservées). */
export async function generateClasses(input: ClassesInput): Promise<ActionResult<{ created: number }>> {
  const ctx = await context("manageAcademics");
  if (!ctx) return fail("errors.forbidden");
  const parsed = classesSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { supabase, schoolId } = ctx;

  const { data: year } = await supabase.from("academic_years").select("id").eq("school_id", schoolId).eq("is_current", true).maybeSingle();
  if (!year) return fail("setup.errors.noYear");

  const { data: levels } = await supabase.from("levels").select("id, code, label, series").eq("school_id", schoolId);
  const levelById = new Map((levels ?? []).map((level) => [level.id, level]));

  const rows = parsed.data.levels.flatMap(({ levelId, count }) => {
    const level = levelById.get(levelId);
    if (!level) return [];
    return classNames({ code: level.code, label: level.label, series: level.series ?? undefined }, count).map((name) => ({
      school_id: schoolId,
      academic_year_id: year.id,
      level_id: levelId,
      name,
      capacity: parsed.data.capacity,
    }));
  });

  if (rows.length === 0) return ok({ created: 0 });
  const { data, error } = await supabase
    .from("classes")
    .upsert(rows, { onConflict: "academic_year_id,name", ignoreDuplicates: true })
    .select("id");
  if (error) return fail("errors.unknown");

  refresh();
  return ok({ created: data?.length ?? 0 });
}

/** Étape 6 — seuils des mentions et pondération des évaluations. */
export async function saveEvaluationSettings(input: EvaluationInput): Promise<ActionResult> {
  const ctx = await context("manageSchool");
  if (!ctx) return fail("errors.forbidden");
  const parsed = evaluationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const { data } = await ctx.supabase.from("schools").select("settings").eq("id", ctx.schoolId).single();
  const settings = parseSchoolSettings(data?.settings);
  const { error } = await mergeSettings(ctx.supabase, ctx.schoolId, {
    ...settings,
    mentionThresholds: parsed.data.mentionThresholds,
    evaluationWeights: parsed.data.evaluationWeights,
  });
  if (error) return fail("errors.unknown");

  refresh();
  return ok(undefined);
}
