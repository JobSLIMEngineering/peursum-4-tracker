// Maakt de app-iconen (PWA, Apple, favicon) in public/icons/ uit één SVG.
// Gebruik: node scripts/build-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Rood vlak met donkere schuine baan; "P" in wit en de "4" in een zwart blok met harde schaduw,
// zoals het logo in de kopbalk. `pad` geeft ruimte voor maskable iconen (veilige zone).
const svg = (pad = 0) => {
  const s = 512;
  const inner = s - pad * 2;
  const k = inner / 512;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" fill="#e1242f"/>
  <polygon points="${s * 0.55},0 ${s * 0.9},0 ${s * 0.62},${s} ${s * 0.27},${s}" fill="#000" fill-opacity="0.16"/>
  <g transform="translate(${pad} ${pad}) scale(${k}) skewX(-8) translate(40 22)">
    <text x="70" y="352" font-family="Impact, 'Arial Black', sans-serif" font-size="300" fill="#000" fill-opacity="0.3">P</text>
    <text x="58" y="340" font-family="Impact, 'Arial Black', sans-serif" font-size="300" fill="#fff">P</text>
    <rect x="262" y="100" width="170" height="262" fill="#000" fill-opacity="0.35" transform="translate(14 14)"/>
    <rect x="262" y="100" width="170" height="262" fill="#0d0b0c"/>
    <text x="347" y="335" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif" font-size="250" fill="#fff">4</text>
  </g>
</svg>`;
};

const out = new URL("../public/icons/", import.meta.url);
mkdirSync(out, { recursive: true });

const png = (pad, size, name) =>
  sharp(Buffer.from(svg(pad))).resize(size, size).png().toFile(fileURLToPath(new URL(name, out)));

writeFileSync(new URL("icon.svg", out), svg());
await Promise.all([
  png(0, 192, "icon-192.png"),
  png(0, 512, "icon-512.png"),
  png(64, 512, "maskable-512.png"),
  png(0, 180, "apple-touch-icon.png"),
  png(0, 48, "favicon-48.png"),
]);
console.log("Iconen gemaakt in public/icons/");
