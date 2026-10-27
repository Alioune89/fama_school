import { NextResponse } from "next/server";
import { z } from "zod";
import { pdfFileName } from "@/features/report-cards/file-name";
import { htmlToPdf } from "@/features/report-cards/pdf";
import { getReportCard, isReportCardDownloadBlocked, listClassReportCards } from "@/features/report-cards/queries";
import { renderReportCardsHtml } from "@/features/report-cards/render";
import { createClient } from "@/lib/supabase/server";

// Une classe entière : une quarantaine de pages.
export const maxDuration = 120;

const querySchema = z.object({ classe: z.uuid(), periode: z.uuid() });

/** PDF de tous les bulletins d'une classe (?classe=&periode=), par ordre alphabétique, pour l'impression. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!query.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const readable = await listClassReportCards(query.data.classe, query.data.periode);
  // Un parent ne lit que les bulletins de ses enfants (RLS) : le blocage pour impayé s'applique aussi ici.
  const blocked = await Promise.all(readable.map((card) => isReportCardDownloadBlocked(card.id)));
  const cards = readable
    .filter((_, index) => !blocked[index])
    .sort(
      (a, b) =>
        a.data.student.lastName.localeCompare(b.data.student.lastName, "fr") ||
        a.data.student.firstName.localeCompare(b.data.student.firstName, "fr"),
    );
  if (cards.length === 0) {
    return NextResponse.json({ error: readable.length > 0 ? "unpaid" : "notFound" }, { status: readable.length > 0 ? 403 : 404 });
  }

  // Même école pour toute la classe : le logo se lit une fois.
  const logoUrl = (await getReportCard(cards[0]!.id))?.logoUrl ?? null;
  const html = await renderReportCardsHtml(
    cards.map((card) => ({ data: card.data, code: card.code, logoUrl })),
    url.origin,
  );
  const pdf = await htmlToPdf(html);
  const { className, periodLabel } = cards[0]!.data;
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdfFileName("bulletins", className, periodLabel)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
