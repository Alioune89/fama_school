import { NextResponse } from "next/server";
import { getPayment } from "@/features/payments/queries";
import { renderReceiptHtml } from "@/features/payments/render";
import { pdfFileName } from "@/features/report-cards/file-name";
import { htmlToPdf } from "@/features/report-cards/pdf";
import { createClient } from "@/lib/supabase/server";

// Lancement de Chromium et rendu : quelques secondes.
export const maxDuration = 60;

/** PDF d'un reçu. La RLS décide qui le lit : personnel de l'école, parent de l'élève. */
export async function GET(request: Request, { params }: RouteContext<"/api/recus/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const payment = await getPayment(id);
  if (!payment) return NextResponse.json({ error: "notFound" }, { status: 404 });

  const pdf = await htmlToPdf(await renderReceiptHtml(payment, new URL(request.url).origin), "A5");
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdfFileName("recu", payment.number, payment.studentName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
