import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { qrSvg, verifyUrl } from "../../report-cards/render";
import { ScaledSheets } from "../../report-cards/components/scaled-sheets";
import { fontFaces } from "../../report-cards/styles";
import type { PaymentDetail } from "../queries";
import { ReceiptDocument } from "../receipt";
import { RECEIPT_CSS } from "../receipt-styles";

/** Largeur d'une page A5 en pixels CSS (148 mm). */
const A5_WIDTH = 559.4;

async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Aperçu à l'écran d'un reçu, identique au PDF. */
export async function ReceiptPreview({ payment }: { payment: PaymentDetail }) {
  const [t, origin] = await Promise.all([getTranslations("receipts"), requestOrigin()]);
  const url = verifyUrl(origin, payment.code);
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: fontFaces((font) => `/fonts/report-card/${font}.woff2`) + RECEIPT_CSS }} />
      {/* Largeur fixée par le conteneur (jamais par l'aperçu lui-même, qui s'y ajuste). */}
      <div className="w-full max-w-[148mm]">
        <ScaledSheets pageWidth={A5_WIDTH}>
          <ReceiptDocument payment={payment} t={t} verifyUrl={url} qrSvg={await qrSvg(url)} logoUrl={payment.school.logoUrl} />
        </ScaledSheets>
      </div>
    </>
  );
}
