import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { listWeekReports } from "@/features/daily-reports/queries";
import { renderWeekHtml } from "@/features/daily-reports/render";
import { shiftDays, weekStart } from "@/features/daily-reports/week";
import { htmlToPdf } from "@/features/report-cards/pdf";
import { getSchoolContext } from "@/lib/auth/school-context";
import { permissions } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/format";

// Lancement de Chromium et rendu : quelques secondes.
export const maxDuration = 60;

/** Compilation hebdomadaire des rapports journaliers en PDF (?semaine=AAAA-MM-JJ), pour la direction pédagogique. */
export async function GET(request: Request) {
  const ctx = await getSchoolContext("direction");
  if (!ctx || !permissions.manageAcademics(ctx.roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const requested = new URL(request.url).searchParams.get("semaine") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requested)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const monday = weekStart(requested);
  const [reports, t] = await Promise.all([
    listWeekReports(ctx.schoolId, monday),
    getTranslations({ locale: "fr", namespace: "dailyReports" }),
  ]);
  const html = await renderWeekHtml({
    schoolName: ctx.schoolName,
    weekLabel: t("week", {
      from: formatDate(monday, { day: "numeric", month: "long" }),
      to: formatDate(shiftDays(monday, 6), { day: "numeric", month: "long" }),
    }),
    reports,
    labels: {
      title: t("pdfTitle"),
      voice: (minutes, seconds) => t("pdfVoice", { minutes, seconds }),
      empty: t("emptyWeek"),
    },
  });
  const pdf = await htmlToPdf(html);
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rapports-semaine-${monday}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
