// Maakt de rode "bliksem"-textuur zoals op de Instagram-posts van Peursum 4:
// zwart midden, rode vertakte vonken en gloed langs de randen.
// Gebruik: node scripts/build-texture.mjs
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const W = 1080;
const H = 1920;

// Vaste zaadwaarde: elke keer dezelfde textuur
let seed = 4;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/** Bliksemlijn met vertakkingen (midpoint displacement) */
function bolt(x1, y1, x2, y2, rough, depth, out) {
  if (depth === 0) {
    out.push(`M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`);
    return;
  }
  const mx = (x1 + x2) / 2 + (rnd() - 0.5) * rough;
  const my = (y1 + y2) / 2 + (rnd() - 0.5) * rough;
  bolt(x1, y1, mx, my, rough / 2, depth - 1, out);
  bolt(mx, my, x2, y2, rough / 2, depth - 1, out);
  if (depth > 2 && rnd() < 0.35) {
    const a = Math.atan2(y2 - y1, x2 - x1) + (rnd() - 0.5) * 1.6;
    const len = Math.hypot(x2 - x1, y2 - y1) * (0.3 + rnd() * 0.4);
    bolt(mx, my, mx + Math.cos(a) * len, my + Math.sin(a) * len, rough / 2, depth - 2, out);
  }
}

/** Willekeurig punt dicht bij een rand (meer vonken aan de zijkanten, midden blijft donker) */
function edgePoint() {
  const side = Math.floor(rnd() * 4);
  const d = rnd() ** 3 * 230;
  if (side === 0) return [d, rnd() * H];
  if (side === 1) return [W - d, rnd() * H];
  if (side === 2) return [rnd() * W, d];
  return [rnd() * W, H - d];
}

const paths = [];
for (let i = 0; i < 170; i++) {
  const [x, y] = edgePoint();
  const a = rnd() * Math.PI * 2;
  const len = 50 + rnd() * 200;
  bolt(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, 90, 6, paths);
}
const d = paths.join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="vig" cx="50%" cy="50%" r="75%">
      <stop offset="40%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#6a0a12" stop-opacity="1"/>
    </radialGradient>
    <radialGradient id="fade" cx="50%" cy="50%" r="60%">
      <stop offset="35%" stop-color="#080606" stop-opacity="1"/>
      <stop offset="100%" stop-color="#080606" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="7" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="#070505"/>
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
  <g filter="url(#glow)" fill="none" stroke-linecap="round">
    <path d="${d}" stroke="#c4141e" stroke-width="2.4" stroke-opacity="0.9"/>
    <path d="${d}" stroke="#ff4a52" stroke-width="0.8" stroke-opacity="0.9"/>
  </g>
  <rect width="${W}" height="${H}" fill="url(#fade)" opacity="0.65"/>
</svg>`;

const outDir = new URL("../public/", import.meta.url);
mkdirSync(outDir, { recursive: true });
await sharp(Buffer.from(svg)).jpeg({ quality: 78, mozjpeg: true }).toFile(fileURLToPath(new URL("texture.jpg", outDir)));
console.log("public/texture.jpg gemaakt");
