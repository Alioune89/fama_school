import { getTranslations } from "next-intl/server";
import { requestOrigin } from "@/lib/request-origin";
import type { ReportCardDocumentData } from "../queries";
import { ReportCardDocument } from "../document";
import { qrSvg, verifyUrl } from "../render";
import { fontFaces, REPORT_CARD_CSS } from "../styles";
import { ScaledSheets } from "./scaled-sheets";

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
