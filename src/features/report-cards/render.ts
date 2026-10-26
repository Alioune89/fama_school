import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { getTranslations } from "next-intl/server";
import type { ReportCardData } from "./build";
import { ReportCardDocument } from "./document";
import { fontFaces, REPORT_CARD_CSS, REPORT_CARD_FONTS } from "./styles";

/** Adresse de vérification imprimée sur le bulletin (page publique, Lot 3.6). */
export const verifyUrl = (origin: string, code: string) => `${origin}/verifier/${code}`;

export const qrSvg = (url: string) => QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M" });

/** Polices intégrées au document : le Chromium du serveur n'en a aucune (fichiers inclus par next.config.ts). */
export async function embeddedFonts() {
  const entries = await Promise.all(
    REPORT_CARD_FONTS.map(async (font) => {
      const file = await readFile(path.join(process.cwd(), "public/fonts/report-card", `${font}.woff2`));
      return [font, `data:font/woff2;base64,${file.toString("base64")}`] as const;
    }),
  );
  const urls = new Map(entries);
  return fontFaces((font) => urls.get(font)!);
}

/** Logo intégré au document (le PDF ne dépend pas du réseau au moment de l'impression). */
export async function embeddedImage(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "image/png";
    return `data:${type};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

export type CardToRender = { data: ReportCardData; code: string; logoUrl: string | null };

/** Document HTML autonome d'un ou plusieurs bulletins (une page A4 par bulletin, deux en franco-arabe). */
export async function renderReportCardsHtml(cards: CardToRender[], origin: string): Promise<string> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const [t, fonts] = await Promise.all([getTranslations({ locale: "fr", namespace: "reportCards" }), embeddedFonts()]);
  const logos = new Map<string, string | null>();
  for (const url of new Set(cards.map((card) => card.logoUrl))) if (url) logos.set(url, await embeddedImage(url));

  const pages = await Promise.all(
    cards.map(async (card) => {
      const url = verifyUrl(origin, card.code);
      return renderToStaticMarkup(
        ReportCardDocument({
          data: card.data,
          t,
          code: card.code,
          verifyUrl: url,
          qrSvg: await qrSvg(url),
          logoUrl: card.logoUrl ? (logos.get(card.logoUrl) ?? null) : null,
        }),
      );
    }),
  );
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${fonts}${REPORT_CARD_CSS} body{margin:0}</style></head><body>${pages.join("")}</body></html>`;
}
