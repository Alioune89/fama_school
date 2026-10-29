import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DAILY_REPORT_BUCKET } from "./bucket";
import { shiftDays } from "./week";

export type DailyReport = {
  id: string;
  authorId: string;
  authorName: string;
  reportDate: string;
  body: string | null;
  audioPath: string | null;
  audioSeconds: number | null;
  /** Lien d'écoute temporaire (une heure). */
  audioUrl: string | null;
};

type Row = {
  id: string;
  author_id: string;
  author_name: string;
  report_date: string;
  body: string | null;
  audio_path: string | null;
  audio_seconds: number | null;
};

async function withAudio(rows: Row[]): Promise<DailyReport[]> {
  const supabase = await createClient();
  const paths = rows.flatMap((row) => (row.audio_path ? [row.audio_path] : []));
  const { data: signed } = paths.length
    ? await supabase.storage.from(DAILY_REPORT_BUCKET).createSignedUrls(paths, 3600)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const urls = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));
  return rows.map((row) => ({
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    reportDate: row.report_date,
    body: row.body,
    audioPath: row.audio_path,
    audioSeconds: row.audio_seconds,
    audioUrl: row.audio_path ? (urls.get(row.audio_path) ?? null) : null,
  }));
}

const SELECT = "id, author_id, author_name, report_date, body, audio_path, audio_seconds";

/** Rapports du professeur connecté, les plus récents d'abord. */
export async function listMyReports(schoolId: string, userId: string, limit = 14): Promise<DailyReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_reports")
    .select(SELECT)
    .eq("school_id", schoolId)
    .eq("author_id", userId)
    .order("report_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return withAudio((data ?? []) as Row[]);
}

/** Rapports d'une semaine (lundi → dimanche) pour la direction pédagogique, par jour puis par auteur. */
export async function listWeekReports(schoolId: string, monday: string): Promise<DailyReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_reports")
    .select(SELECT)
    .eq("school_id", schoolId)
    .gte("report_date", monday)
    .lte("report_date", shiftDays(monday, 6))
    .order("report_date")
    .order("author_name")
    .limit(1000);
  if (error) throw error;
  return withAudio((data ?? []) as Row[]);
}
