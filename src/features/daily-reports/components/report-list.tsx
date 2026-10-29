import { Mic } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { formatDate } from "@/lib/format";
import type { DailyReport } from "../queries";

const duration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** Rapports journaliers : date (et auteur pour la direction), texte, note vocale à écouter. */
export async function ReportList({ reports, showAuthor = false }: { reports: DailyReport[]; showAuthor?: boolean }) {
  const t = await getTranslations("dailyReports");
  return (
    <ul className="space-y-3" aria-label={t("listLabel")}>
      {reports.map((report) => (
        <li key={report.id} className="rounded-xl bg-white p-4 shadow-card ring-1 ring-line/70">
          <p className="text-xs font-semibold text-ink-soft first-letter:uppercase">
            {[
              showAuthor ? report.authorName : null,
              formatDate(report.reportDate, { weekday: "long", day: "numeric", month: "long" }),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {report.body && <p className="mt-1.5 text-sm whitespace-pre-line text-ink">{report.body}</p>}
          {report.audioUrl && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Mic className="size-4 text-azure-700" aria-hidden />
              <audio
                controls
                preload="none"
                src={report.audioUrl}
                className="h-10 max-w-full"
                aria-label={t("voiceOf", { name: report.authorName })}
              />
              {report.audioSeconds && <span className="text-xs text-muted-foreground">{duration(report.audioSeconds)}</span>}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
