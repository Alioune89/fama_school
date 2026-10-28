import "server-only";
import { createClient } from "@/lib/supabase/server";

export type EventKind = "holiday" | "exam" | "meeting" | "event";

/** Une entrée de l'agenda : événement de l'école, composition ou période de l'année. */
export type AgendaItem = {
  id: string;
  kind: EventKind | "composition" | "period";
  title: string;
  detail: string | null;
  startsOn: string;
  endsOn: string;
  staffOnly: boolean;
  /** Événement modifiable (créé dans le calendrier) ; les compositions et périodes viennent d'ailleurs. */
  editable: boolean;
};

/** Événements du calendrier visibles par le compte connecté entre deux dates (la RLS limite). */
export async function listEvents(from: string, to: string, schoolId?: string): Promise<AgendaItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("school_events")
    .select("id, kind, title, description, starts_on, ends_on, staff_only")
    .lte("starts_on", to)
    .gte("ends_on", from)
    .order("starts_on")
    .limit(500);
  if (schoolId) query = query.eq("school_id", schoolId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind as EventKind,
    title: row.title,
    detail: row.description,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    staffOnly: row.staff_only,
    editable: true,
  }));
}

/** Pour la direction : compositions programmées et début des périodes de l'année en cours. */
export async function listSchoolMilestones(schoolId: string, from: string, to: string): Promise<AgendaItem[]> {
  const supabase = await createClient();
  const [compositions, periods] = await Promise.all([
    supabase
      .from("evaluations")
      .select("id, title, held_on, class:classes!inner(name, year:academic_years!inner(is_current)), subject:subjects(name)")
      .eq("school_id", schoolId)
      .eq("kind", "composition")
      .eq("class.year.is_current", true)
      .gte("held_on", from)
      .lte("held_on", to)
      .limit(1000),
    supabase
      .from("periods")
      .select("id, label, starts_on, ends_on, year:academic_years!inner(is_current)")
      .eq("school_id", schoolId)
      .eq("year.is_current", true),
  ]);
  if (compositions.error) throw compositions.error;
  if (periods.error) throw periods.error;
  return [
    ...(compositions.data ?? []).map((row) => ({
      id: row.id,
      kind: "composition" as const,
      title: row.title,
      detail: [row.class?.name, row.subject?.name].filter(Boolean).join(" · "),
      startsOn: row.held_on,
      endsOn: row.held_on,
      staffOnly: true,
      editable: false,
    })),
    ...(periods.data ?? [])
      .filter((row) => row.starts_on >= from && row.starts_on <= to)
      .map((row) => ({
        id: row.id,
        kind: "period" as const,
        title: row.label,
        detail: null,
        startsOn: row.starts_on,
        endsOn: row.ends_on,
        staffOnly: false,
        editable: false,
      })),
  ];
}
