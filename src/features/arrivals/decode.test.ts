import jsQR from "jsqr";
import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { badgeText, parseBadge } from "./badge";

/** Image RGBA d'un QR code (4 pixels par module, marge blanche), comme une photo nette de la carte. */
function render(text: string) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const scale = 4;
  const margin = 4;
  const size = (qr.modules.size + margin * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let row = 0; row < qr.modules.size; row++) {
    for (let col = 0; col < qr.modules.size; col++) {
      if (!qr.modules.get(row, col)) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const offset = (((row + margin) * scale + dy) * size + (col + margin) * scale + dx) * 4;
          data[offset] = data[offset + 1] = data[offset + 2] = 0;
        }
      }
    }
  }
  return { data, size };
}

describe("lecture d'une carte", () => {
  it("le QR code imprimé redonne le jeton de l'élève (lecteur de secours, sans BarcodeDetector)", () => {
    const token = "5f2c0e9a7b3d4c18a6e1f0b2d9c84a37";
    const { data, size } = render(badgeText(token));
    const read = jsQR(data, size, size, { inversionAttempts: "dontInvert" });
    expect(read?.data).toBe(badgeText(token));
    expect(parseBadge(read!.data)).toBe(token);
  });
});
