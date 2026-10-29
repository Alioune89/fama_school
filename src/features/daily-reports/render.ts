import "server-only";
import { formatDate } from "@/lib/format";
import { embeddedFonts } from "../report-cards/render";
import type { DailyReport } from "./queries";

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Compilation hebdomadaire des rapports journaliers, en HTML autonome pour le PDF (A4). */
export async function renderWeekHtml({
  schoolName,
  weekLabel,
  reports,
  labels,
}: {
  schoolName: string;
  weekLabel: string;
  reports: DailyReport[];
  labels: { title: string; voice: (minutes: number, seconds: number) => string; empty: string };
}) {
  const fonts = await embeddedFonts();
  const days = [...new Set(reports.map((r) => r.reportDate))];
  const body = days
    .map((day) => {
      const items = reports
        .filter((r) => r.reportDate === day)
        .map(
          (r) =>
            `<article><h3>${escape(r.authorName)}</h3>${r.body ? `<p>${escape(r.body).replace(/\n/g, "<br>")}</p>` : ""}${
              r.audioSeconds
                ? `<p class="voice">${escape(labels.voice(Math.floor(r.audioSeconds / 60), r.audioSeconds % 60))}</p>`
                : ""
            }</article>`,
        )
        .join("");
      return `<section><h2>${escape(formatDate(day, { weekday: "long", day: "numeric", month: "long" }))}</h2>${items}</section>`;
    })
    .join("");
  const css = `
    body { font-family: "Plus Jakarta Sans", sans-serif; color: #1d2433; margin: 0; padding: 18mm 16mm; font-size: 11pt; }
    header { border-bottom: 2px solid #1570a6; padding-bottom: 8px; margin-bottom: 14px; }
    header p { margin: 0; color: #5b6475; font-size: 10pt; }
    h1 { font-size: 18pt; margin: 2px 0 0; }
    h2 { font-size: 12pt; margin: 16px 0 6px; text-transform: capitalize; color: #1570a6; }
    article { break-inside: avoid; border: 1px solid #e9ebf2; border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; }
    h3 { font-size: 10.5pt; margin: 0 0 4px; }
    article p { margin: 0; line-height: 1.45; }
    .voice { color: #5b6475; font-style: italic; margin-top: 4px; }
  `;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${fonts}${css}</style></head><body><header><p>${escape(
    schoolName,
  )}</p><h1>${escape(labels.title)} · ${escape(weekLabel)}</h1></header>${body || `<p>${escape(labels.empty)}</p>`}</body></html>`;
}
