import "server-only";
import { getTranslations } from "next-intl/server";
import { embeddedFonts, embeddedImage, qrSvg, verifyUrl } from "../report-cards/render";
import { RECEIPT_CSS } from "./receipt-styles";
import { ReceiptDocument } from "./receipt";
import type { PaymentDetail } from "./queries";

/** Document HTML autonome d'un reçu, pour le PDF (polices et logo intégrés). */
export async function renderReceiptHtml(payment: PaymentDetail, origin: string): Promise<string> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const url = verifyUrl(origin, payment.code);
  const [t, fonts, logo, qr] = await Promise.all([
    getTranslations({ locale: "fr", namespace: "receipts" }),
    embeddedFonts(),
    embeddedImage(payment.school.logoUrl),
    qrSvg(url),
  ]);
  const body = renderToStaticMarkup(ReceiptDocument({ payment, t, verifyUrl: url, qrSvg: qr, logoUrl: logo }));
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${fonts}${RECEIPT_CSS} body{margin:0}</style></head><body>${body}</body></html>`;
}
