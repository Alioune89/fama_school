/**
 * Mise en page du reçu (A5 portrait), autonome comme celle du bulletin : même feuille pour l'aperçu
 * et pour le PDF. Classes « rr- » ; polices : fontFaces de src/features/report-cards/styles.ts.
 */
export const RECEIPT_CSS = `
@page { size: A5; margin: 0; }
.rr-page {
  box-sizing: border-box; position: relative; width: 148mm; min-height: 210mm; padding: 9mm 10mm; overflow: hidden;
  display: flex; flex-direction: column; gap: 4mm;
  background: #fff; color: #1e2433; font-family: "RC Sans", sans-serif; font-size: 8.8pt; line-height: 1.4;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.rr-page *, .rr-page *::before, .rr-page *::after { box-sizing: border-box; }
.rr-header { display: flex; gap: 3mm; align-items: center; border-bottom: 0.6mm solid #1b8fc7; padding-bottom: 2.5mm; }
.rr-logo { width: 15mm; height: 15mm; object-fit: contain; flex: none; }
.rr-logo-placeholder { width: 15mm; height: 15mm; flex: none; border-radius: 2.5mm; background: #e8f5fc; color: #1b8fc7; font-weight: 800; font-size: 12pt; display: flex; align-items: center; justify-content: center; }
.rr-school { margin: 0; font-weight: 800; font-size: 11pt; }
.rr-muted { color: #5b6478; }
.rr-small { font-size: 7.4pt; }
.rr-title { display: flex; justify-content: space-between; align-items: baseline; }
.rr-title h1 { margin: 0; font-size: 13pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; color: #13628a; }
.rr-number { font-weight: 800; font-size: 11pt; }
.rr-box { border: 0.3mm solid #dde3ec; border-radius: 2mm; padding: 3mm 3.5mm; }
.rr-grid { display: grid; grid-template-columns: auto 1fr; gap: 1.2mm 4mm; margin: 0; }
.rr-grid dt { color: #5b6478; }
.rr-grid dd { margin: 0; font-weight: 600; }
.rr-amount { display: flex; justify-content: space-between; align-items: baseline; background: #e8f5fc; border-radius: 2mm; padding: 3mm 3.5mm; }
.rr-amount strong { font-size: 16pt; font-weight: 800; }
.rr-words { margin: 0; font-style: italic; }
.rr-table { width: 100%; border-collapse: collapse; }
.rr-table th { text-align: start; font-size: 7.4pt; color: #5b6478; font-weight: 600; padding: 1mm 0; border-bottom: 0.3mm solid #dde3ec; }
.rr-table td { padding: 1.2mm 0; border-bottom: 0.25mm solid #eef1f5; }
.rr-num { text-align: end; white-space: nowrap; font-variant-numeric: tabular-nums; }
.rr-signature { margin-top: auto; display: flex; justify-content: flex-end; }
.rr-signature div { width: 55mm; border-top: 0.3mm solid #b8c1d1; padding-top: 1.5mm; min-height: 14mm; }
.rr-footer { display: flex; gap: 3mm; align-items: center; border-top: 0.3mm solid #dde3ec; padding-top: 2.5mm; }
.rr-qr { width: 17mm; height: 17mm; flex: none; }
.rr-qr svg { width: 100%; height: 100%; display: block; }
.rr-code { font-family: ui-monospace, monospace; font-weight: 700; letter-spacing: 0.08em; }
.rr-cancelled { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
.rr-cancelled span { transform: rotate(-24deg); border: 1.2mm solid rgba(180, 35, 24, 0.55); color: rgba(180, 35, 24, 0.55); border-radius: 3mm; padding: 2mm 8mm; font-size: 30pt; font-weight: 800; letter-spacing: 0.1em; }
`;
