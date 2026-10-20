import "server-only";
import { cache } from "react";
import { listClasses } from "@/features/classes/queries";
import { getSetupData } from "@/features/setup/queries";
import { createClient } from "@/lib/supabase/server";

/**
 * Indicateurs de l'école active (la RLS garantit que seules les données de cette école sont lues).
 * Mis en cache le temps d'une requête : chaque bloc du tableau de bord se charge séparément.
 */
export const getDirectionDashboard = cache(async (schoolId: string) => {
  const supabase = await createClient();
  const [classes, setup, teachers, guardians, connectedGuardians] = await Promise.all([
    listClasses(schoolId),
    getSetupData(schoolId),
    supabase
      .from("school_staff")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("role", "teacher")
      .eq("status", "active"),
    supabase.from("guardians").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("guardians").select("id", { count: "exact", head: true }).eq("school_id", schoolId).not("user_id", "is", null),
  ]);

  const rows = classes.cycles.flatMap((cycle) => cycle.classes);
  const girls = rows.reduce((sum, c) => sum + c.girls, 0);
  const boys = rows.reduce((sum, c) => sum + c.boys, 0);

  return {
    yearLabel: classes.yearLabel,
    students: girls + boys,
    girls,
    boys,
    classesCount: rows.length,
    classes: rows.map((c) => ({ id: c.id, name: c.name, girls: c.girls, boys: c.boys, capacity: c.capacity })),
    teachers: teachers.count ?? 0,
    guardians: guardians.count ?? 0,
    connectedGuardians: connectedGuardians.count ?? 0,
    setup: setup.status,
    calendar: setup.year ? { startsOn: setup.year.starts_on, endsOn: setup.year.ends_on, periods: setup.year.periods } : null,
  };
});

export type DirectionDashboard = Awaited<ReturnType<typeof getDirectionDashboard>>;
