// Rode penseelstreek (zoals onder "UITSLAG" op Instagram): taps toelopend, met droge strepen.
// Gebruik: node scripts/build-brush.mjs
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const W = 1000;
const H = 90;
let seed = 31;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// Hoofdvorm: links dun, rechts dikker, licht schuin oplopend
const top = [];
const bottom = [];
for (let x = 0; x <= W; x += 10) {
  const t = x / W;
  const thick = 8 + 34 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.55);
  const mid = H * 0.62 - t * 22;
  top.push(`${x},${(mid - thick / 2 + (rnd() - 0.5) * 4).toFixed(1)}`);
  bottom.unshift(`${x},${(mid + thick / 2 + (rnd() - 0.5) * 5).toFixed(1)}`);
}
// Droge strepen die uit de streek lopen
const streaks = Array.from({ length: 26 }, () => {
  const y = H * 0.62 - 22 * rnd() + (rnd() - 0.5) * 30;
  const x1 = rnd() * W * 0.6;
  const x2 = x1 + 80 + rnd() * 320;
  return `<line x1="${x1.toFixed(0)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(0)}" y2="${(y - 6 * rnd()).toFixed(1)}" stroke="#e1242f" stroke-width="${(1 + rnd() * 2.5).toFixed(1)}" stroke-opacity="${(0.4 + rnd() * 0.5).toFixed(2)}"/>`;
}).join("");
// Gaten (droge kwast)
const gaps = Array.from({ length: 40 }, () => {
  const x = rnd() * W;
  const y = H * 0.62 - (x / W) * 22 + (rnd() - 0.5) * 26;
  return `<rect x="${x.toFixed(0)}" y="${y.toFixed(1)}" width="${(10 + rnd() * 60).toFixed(0)}" height="${(1 + rnd() * 2).toFixed(1)}" fill="#000"/>`;
}).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><mask id="m"><rect width="${W}" height="${H}" fill="#fff"/>${gaps}</mask></defs>
  <g mask="url(#m)">
    <polygon points="${[...top, ...bottom].join(" ")}" fill="#d31620"/>
    ${streaks}
  </g>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(new URL("../public/brush.png", import.meta.url)));
console.log("public/brush.png gemaakt");
