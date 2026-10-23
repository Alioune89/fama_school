import "server-only";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

/**
 * Chromium sans interface : celui de @sparticuz/chromium sur les serveurs Linux (Vercel, CI),
 * Google Chrome en développement sur macOS, ou celui indiqué par CHROME_PATH.
 */
async function browserOptions() {
  if (process.env.CHROME_PATH) return { executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] };
  if (process.platform === "linux") return { executablePath: await chromium.executablePath(), args: chromium.args };
  if (process.platform === "darwin") {
    return { executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", args: [] };
  }
  throw new Error("Aucun Chromium disponible : définissez CHROME_PATH.");
}

/** Page HTML complète (polices et images incluses) vers un PDF A4. */
export async function htmlToPdf(html: string): Promise<Uint8Array<ArrayBuffer>> {
  const browser = await puppeteer.launch({ ...(await browserOptions()), headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    return new Uint8Array(pdf);
  } finally {
    await browser.close();
  }
}
