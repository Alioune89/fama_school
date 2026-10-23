import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import type { ReportCardDocumentData } from "../queries";
import { ReportCardDocument } from "../document";
import { qrSvg, verifyUrl } from "../render";
import { fontFaces, REPORT_CARD_CSS } from "../styles";
import { ScaledSheets } from "./scaled-sheets";

/** Origine de la requête : l'adresse de vérification imprimée pointe vers le site consulté. */
async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Aperçu à l'écran d'un bulletin, identique au PDF (même gabarit, mêmes polices). */
export async function ReportCardPreview({ card }: { card: ReportCardDocumentData }) {
  const [t, origin] = await Promise.all([getTranslations("reportCards"), requestOrigin()]);
  const url = verifyUrl(origin, card.code);
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: fontFaces((font) => `/fonts/report-card/${font}.woff2`) + REPORT_CARD_CSS }} />
      <ScaledSheets>
        <ReportCardDocument
          data={card.data}
          t={t}
          code={card.code}
          verifyUrl={url}
          qrSvg={await qrSvg(url)}
          logoUrl={card.logoUrl}
        />
      </ScaledSheets>
    </>
  );
}
