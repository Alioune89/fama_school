// Génère les icônes PWA et le favicon à partir du logo Fama School.
// Usage : node scripts/generate-icons.mjs (les fichiers produits sont versionnés).
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "public", "icons");

const mark = (size, { maskable = false } = {}) => {
  // Icône « maskable » : fond plein et motif réduit pour rester dans la zone sûre (cercle de 80 %).
  const scale = maskable ? 0.62 : 1;
  const offset = (32 - 32 * scale) / 2;
  const radius = maskable ? 0 : 9;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#6fc8f0"/>
      <stop offset="1" stop-color="#1b8fc7"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="${radius}" fill="url(#g)"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <rect x="10" y="8" width="4.5" height="16" rx="2.25" fill="#fff"/>
    <rect x="10" y="8" width="13" height="4.5" rx="2.25" fill="#fff"/>
    <rect x="10" y="14.5" width="9" height="4" rx="2" fill="#fff"/>
    <circle cx="24" cy="21.5" r="3" fill="#fae27c"/>
  </g>
</svg>`;
};

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "maskable-512.png", size: 512, maskable: true },
  { file: "apple-touch-icon.png", size: 180, maskable: true },
];

await mkdir(out, { recursive: true });
for (const t of targets) {
  const png = await sharp(Buffer.from(mark(t.size, t))).png().toBuffer();
  await writeFile(path.join(out, t.file), png);
  console.log(`✓ public/icons/${t.file}`);
}
await writeFile(path.join(root, "src", "app", "icon.svg"), mark(32));
console.log("✓ src/app/icon.svg");
