/**
 * Mise en page A4 du bulletin, autonome (pas de Tailwind) : la même feuille de style sert à l'aperçu
 * dans l'application et au PDF produit par Chromium. Toutes les classes commencent par « rc- ».
 *
 * Polices : Plus Jakarta Sans (police de l'application) et Noto Naskh Arabic (bulletin franco-arabe),
 * sous licence SIL Open Font License 1.1, fournies dans public/fonts/report-card.
 */

export const REPORT_CARD_FONTS = ["jakarta-latin", "jakarta-latin-ext", "naskh-arabic"] as const;

/** @font-face des polices ; `source` donne l'URL (aperçu) ou les données (PDF) de chaque fichier. */
export function fontFaces(source: (font: (typeof REPORT_CARD_FONTS)[number]) => string) {
  return `
@font-face { font-family: "RC Sans"; font-weight: 400 800; font-display: block; src: url(${source("jakarta-latin")}) format("woff2");
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
@font-face { font-family: "RC Sans"; font-weight: 400 800; font-display: block; src: url(${source("jakarta-latin-ext")}) format("woff2");
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF; }
@font-face { font-family: "RC Arabic"; font-weight: 400 700; font-display: block; src: url(${source("naskh-arabic")}) format("woff2");
  unicode-range: U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EC2-10EC4, U+10EFC-10EFF, U+1EE00-1EEFF; }
`;
}

export const REPORT_CARD_CSS = `
@page { size: A4; margin: 0; }
.rc-page {
  box-sizing: border-box; width: 210mm; height: 297mm; padding: 11mm 12mm 10mm; overflow: hidden;
  display: flex; flex-direction: column; gap: 4mm;
  background: #fff; color: #1e2433; font-family: "RC Sans", "RC Arabic", sans-serif; font-size: 8.6pt; line-height: 1.35;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.rc-page + .rc-page { break-before: page; }
.rc-page *, .rc-page *::before, .rc-page *::after { box-sizing: border-box; }
.rc-ar { font-family: "RC Arabic", "RC Sans", serif; }
.rc-page[dir="rtl"] { font-family: "RC Arabic", "RC Sans", serif; font-size: 10pt; }

.rc-header { display: grid; grid-template-columns: 22mm 1fr auto; gap: 4mm; align-items: center; border-bottom: 0.6mm solid #1b8fc7; padding-bottom: 3mm; }
.rc-logo { width: 22mm; height: 22mm; object-fit: contain; }
.rc-logo-placeholder { width: 22mm; height: 22mm; border-radius: 3mm; background: #e8f5fc; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14pt; color: #1b8fc7; }
.rc-school { font-size: 12.5pt; font-weight: 800; margin: 0; }
.rc-muted { color: #5b6478; }
.rc-small { font-size: 7.6pt; }
.rc-title { text-align: end; }
.rc-title h1 { margin: 0; font-size: 13pt; font-weight: 800; letter-spacing: 0.02em; text-transform: uppercase; color: #13628a; }
.rc-page[dir="rtl"] .rc-title h1 { text-transform: none; font-size: 15pt; }
.rc-title p { margin: 0.5mm 0 0; font-weight: 600; }

.rc-identity { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5mm 6mm; padding: 3mm 4mm; border-radius: 2mm; background: #f3f6fa; }
.rc-identity dt { font-size: 7pt; color: #5b6478; text-transform: uppercase; letter-spacing: 0.04em; }
.rc-page[dir="rtl"] .rc-identity dt { text-transform: none; font-size: 8.5pt; }
.rc-identity dd { margin: 0; font-weight: 700; }

.rc-table { width: 100%; border-collapse: collapse; }
.rc-table th { background: #13628a; color: #fff; font-weight: 700; font-size: 7.6pt; padding: 1.6mm 1.8mm; text-align: start; }
.rc-page[dir="rtl"] .rc-table th { font-size: 9pt; }
.rc-table td { padding: 1.5mm 1.8mm; border-bottom: 0.25mm solid #dde3ec; vertical-align: top; }
.rc-table tbody tr:nth-child(even) td { background: #f8fafc; }
.rc-table tfoot td { font-weight: 800; background: #e8f5fc; border-bottom: none; }
.rc-num { text-align: center; white-space: nowrap; font-variant-numeric: tabular-nums; }
.rc-strong { font-weight: 800; }
.rc-subject { font-weight: 700; }
.rc-appreciation { color: #3d4559; }

.rc-summary { display: grid; grid-template-columns: 1.1fr 1fr; gap: 4mm; }
.rc-box { border: 0.3mm solid #dde3ec; border-radius: 2mm; padding: 3mm 4mm; }
.rc-box h2 { margin: 0 0 1.5mm; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.05em; color: #13628a; }
.rc-page[dir="rtl"] .rc-box h2 { text-transform: none; font-size: 10pt; }
.rc-general { display: flex; align-items: baseline; gap: 3mm; flex-wrap: wrap; }
.rc-general strong { font-size: 18pt; font-weight: 800; }
.rc-lines { margin: 1.5mm 0 0; padding: 0; list-style: none; display: grid; gap: 0.8mm; }
.rc-badge { display: inline-block; padding: 0.6mm 2.4mm; border-radius: 10mm; font-weight: 700; background: #e7f7ee; color: #14733f; }
.rc-badge-off { background: #eef0f4; color: #5b6478; text-decoration: line-through; }
.rc-badge-warn { background: #fff3db; color: #8a5a00; }
.rc-badge-danger { background: #fde7e7; color: #b42318; }

.rc-signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; margin-top: auto; }
.rc-signatures div { border-top: 0.3mm solid #b8c1d1; padding-top: 1.5mm; min-height: 18mm; }
.rc-footer { display: flex; align-items: center; gap: 4mm; border-top: 0.3mm solid #dde3ec; padding-top: 2.5mm; }
.rc-qr { width: 19mm; height: 19mm; flex: none; }
.rc-qr svg { width: 100%; height: 100%; display: block; }
.rc-code { font-family: ui-monospace, monospace; font-weight: 700; letter-spacing: 0.08em; }
`;
