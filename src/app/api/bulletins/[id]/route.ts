import { NextResponse } from "next/server";
import { pdfFileName } from "@/features/report-cards/file-name";
import { htmlToPdf } from "@/features/report-cards/pdf";
import { getReportCard } from "@/features/report-cards/queries";
import { renderReportCardsHtml } from "@/features/report-cards/render";
import { createClient } from "@/lib/supabase/server";

// Lancement de Chromium et rendu : quelques secondes.
export const maxDuration = 60;

/** PDF d'un bulletin. La RLS décide qui le lit : personnel, enseignants de la classe, parent une fois publié. */
export async function GET(request: Request, { params }: RouteContext<"/api/bulletins/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const card = await getReportCard(id);
  if (!card) return NextResponse.json({ error: "notFound" }, { status: 404 });

  const html = await renderReportCardsHtml([card], new URL(request.url).origin);
  const pdf = await htmlToPdf(html);
  const { student, periodLabel } = card.data;
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdfFileName("bulletin", student.lastName, student.firstName, periodLabel)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
