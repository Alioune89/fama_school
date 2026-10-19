import "server-only";
import { parseSchoolSettings } from "@/lib/domain/school-settings";
import { createClient } from "@/lib/supabase/server";
import { computeSetupStatus } from "./steps";

/** Tout ce que l'assistant de mise en route doit savoir sur l'école active. */
export async function getSetupData(schoolId: string) {
  const supabase = await createClient();

  const [schoolResult, yearResult, cyclesResult, levelsResult, subjectsResult, levelSubjectsResult] = await Promise.all([
    supabase
      .from("schools")
      .select("id, name, short_name, city, region, address, phone, email, logo_path, settings")
      .eq("id", schoolId)
      .single(),
    supabase
      .from("academic_years")
      .select("id, label, starts_on, ends_on, period_kind, periods(id, position, label, starts_on, ends_on, locked_at)")
      .eq("school_id", schoolId)
      .eq("is_current", true)
      .maybeSingle(),
    supabase.from("cycles").select("id, code, label, grading_scale, position").eq("school_id", schoolId).order("position"),
    supabase
      .from("levels")
      .select("id, cycle_id, code, label, series, exam, position")
      .eq("school_id", schoolId)
      .order("position"),
    supabase
      .from("subjects")
      .select("id, name, name_ar, short_name, track, subject_group, position, active")
      .eq("school_id", schoolId)
      .order("position"),
    supabase.from("level_subjects").select("level_id, subject_id, coefficient").eq("school_id", schoolId),
  ]);

  if (schoolResult.error) throw schoolResult.error;
  const year = yearResult.data;

  const classesResult = year
    ? await supabase
        .from("classes")
        .select("id, name, level_id, room, capacity")
        .eq("school_id", schoolId)
        .eq("academic_year_id", year.id)
        .order("name")
    : { data: [] as { id: string; name: string; level_id: string; room: string | null; capacity: number | null }[] };

  const school = schoolResult.data;
  const rawSettings = (school.settings ?? {}) as Record<string, unknown>;
  const levels = levelsResult.data ?? [];
  const levelSubjects = levelSubjectsResult.data ?? [];
  const classes = classesResult.data ?? [];

  const status = computeSetupStatus({
    school: { city: school.city, phone: school.phone },
    hasCurrentYear: Boolean(year),
    levelsCount: levels.length,
    levelSubjectsCount: levelSubjects.length,
    classesCount: classes.length,
    evaluationSaved: "evaluationWeights" in rawSettings || "mentionThresholds" in rawSettings,
  });

  return {
    school,
    settings: parseSchoolSettings(rawSettings),
    year: year ? { ...year, periods: [...(year.periods ?? [])].sort((a, b) => a.position - b.position) } : null,
    cycles: cyclesResult.data ?? [],
    levels,
    subjects: subjectsResult.data ?? [],
    levelSubjects,
    classes,
    status,
  };
}

export type SetupData = Awaited<ReturnType<typeof getSetupData>>;
