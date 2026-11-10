"use client";

import { BASE } from "./base";

/**
 * Peursum 4 Wrapped als video (9:16, voor een Instagram-story of de groepsapp).
 * De kaarten worden op een canvas getekend in dezelfde stijl als de deelposts en in realtime opgenomen
 * met MediaRecorder. Liefst mp4 (werkt overal); kan de browser dat niet, dan webm.
 */

export interface VideoSlide {
  kicker: string;
  title: string;
  big?: string;
  sub?: string;
  /** Afbeeldingen boven de titel: shirtjes (svg-markup) of een clublogo (adres) */
  art?: { svg?: string[]; logo?: string | null };
  /** Regels onder elkaar (bijv. de prijzenrace) */
  list?: string[];
  /** Spelerskaart (svg-markup): walk-out met lichtbundel en de kaart die openklapt */
  card?: string;
}

const W = 1080;
const H = 1920;
const FPS = 30;
const PER = 2.8; // seconden per kaart

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

/** Welk videoformaat deze browser kan opnemen */
export function videoType(): { mime: string; ext: string } | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const [mime, ext] of [
    ["video/mp4;codecs=avc1", "mp4"],
    ["video/mp4", "mp4"],
    ["video/webm;codecs=vp9", "webm"],
    ["video/webm", "webm"],
  ])
    if (MediaRecorder.isTypeSupported(mime)) return { mime, ext };
  return null;
}

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

export async function renderWrappedVideo(slides: VideoSlide[], onProgress: (p: number) => void): Promise<{ blob: Blob; ext: string }> {
  const type = videoType();
  if (!type) throw new Error("Deze browser kan geen video maken.");
  const css = getComputedStyle(document.documentElement);
  const COND = `${css.getPropertyValue("--font-barlow-cond").trim()}, 'Arial Narrow', sans-serif`;
  try {
    await Promise.all([`900 120px ${COND}`, `800 60px ${COND}`, `600 40px ${COND}`].map((f) => document.fonts.load(f)));
  } catch {
    // systeemletters als het niet lukt
  }
  const texture = await loadImage(`${BASE}/texture.jpg`);
  const art = await Promise.all(
    slides.map(async (s) => ({
      shirts: await Promise.all((s.art?.svg ?? []).map((svg) => loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`))),
      logo: s.art?.logo ? await loadImage(s.art.logo) : null,
      card: s.card ? await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.card)}`) : null,
    })),
  );

  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const cx = W / 2;

  const fit = (text: string, weight: number, max: number, width: number) => {
    let px = max;
    do {
      g.font = `${weight} ${px}px ${COND}`;
      px -= 4;
    } while (g.measureText(text).width > width && px > 24);
  };
  const wrap = (text: string, y: number, lineH: number, width: number) => {
    const words = text.split(" ");
    let line = "";
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (g.measureText(t).width > width && line) {
        g.fillText(line, cx, y);
        y += lineH;
        line = w;
      } else line = t;
    }
    if (line) g.fillText(line, cx, y);
  };

  function frame(time: number) {
    const i = Math.min(slides.length - 1, Math.floor(time / PER));
    const t = time - i * PER;
    const s = slides[i];
    // Achtergrond: vonken, licht ademend, met een donkere laag
    g.fillStyle = "#050404";
    g.fillRect(0, 0, W, H);
    if (texture) {
      const sc = Math.max(W / texture.width, H / texture.height) * (1.04 + 0.03 * Math.sin(time / 2));
      g.globalAlpha = 0.85;
      g.drawImage(texture, (W - texture.width * sc) / 2, (H - texture.height * sc) / 2, texture.width * sc, texture.height * sc);
      g.globalAlpha = 1;
    }
    g.fillStyle = "rgba(0,0,0,.45)";
    g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(225,36,47,.75)";
    g.lineWidth = 8;
    g.strokeRect(28, 28, W - 56, H - 56);

    // Voortgangsbalkjes bovenin, zoals bij stories
    const bw = (W - 120 - (slides.length - 1) * 10) / slides.length;
    slides.forEach((_, j) => {
      g.fillStyle = "rgba(255,255,255,.25)";
      g.fillRect(60 + j * (bw + 10), 70, bw, 8);
      g.fillStyle = "#e1242f";
      const f = j < i ? 1 : j === i ? Math.min(1, t / PER) : 0;
      g.fillRect(60 + j * (bw + 10), 70, bw * f, 8);
    });

    // Walk-out: lichtbundel, dan klapt de kaart open (draait in, groeit, gloed)
    if (art[i].card) {
      const card = art[i].card!;
      const beam = g.createLinearGradient(0, H, 0, 0);
      beam.addColorStop(0, "rgba(225,36,47,.85)");
      beam.addColorStop(0.7, "rgba(225,36,47,0)");
      g.globalAlpha = Math.min(1, t / 0.5) * 0.8;
      g.fillStyle = beam;
      const bw2 = 220 + 260 * ease(t / 0.8);
      g.fillRect(cx - bw2 / 2, 0, bw2, H);
      g.globalAlpha = 1;
      const open = ease((t - 0.7) / 0.9);
      if (open > 0) {
        const cw = 640;
        const ch = (cw * 420) / 300;
        g.save();
        g.translate(cx, H / 2 + 40);
        g.scale(Math.max(0.02, open) * (1 + 0.04 * Math.sin(t * 3)), 0.85 + 0.15 * open);
        g.shadowColor = "rgba(225,36,47,.9)";
        g.shadowBlur = 60;
        g.drawImage(card, -cw / 2, -ch / 2, cw, ch);
        g.restore();
      }
      g.fillStyle = "#ff8a92";
      g.font = `800 46px ${COND}`;
      g.textAlign = "center";
      g.fillText(s.kicker.toUpperCase(), cx, 300);
      g.fillStyle = "rgba(255,255,255,.7)";
      g.font = `800 44px ${COND}`;
      g.fillText("#PEURSUM4", cx, H - 110);
      return;
    }

    // Inhoud schuift omhoog en vaagt in
    const k = ease(t / 0.6);
    g.save();
    g.globalAlpha = k;
    g.translate(0, (1 - k) * 60);
    g.textAlign = "center";
    g.textBaseline = "middle";
    let y = 560;
    const a = art[i];
    const imgs = a.shirts.filter((x): x is HTMLImageElement => !!x);
    if (imgs.length) {
      const size = imgs.length > 1 ? 300 : 380;
      const total = size * imgs.length - (imgs.length - 1) * 70;
      imgs.forEach((img, j) => g.drawImage(img, cx - total / 2 + j * (size - 70), y - size / 2, size, size));
      y += size / 2 + 90;
    } else if (a.logo) {
      const sc = 320 / Math.max(a.logo.width, a.logo.height);
      g.drawImage(a.logo, cx - (a.logo.width * sc) / 2, y - (a.logo.height * sc) / 2, a.logo.width * sc, a.logo.height * sc);
      y += 250;
    } else y = 780;

    g.fillStyle = "#ff8a92";
    g.font = `800 46px ${COND}`;
    g.fillText(s.kicker.toUpperCase(), cx, y - (imgs.length || a.logo ? 40 : 0));
    y += 70;
    g.fillStyle = "#ffffff";
    g.shadowColor = "rgba(0,0,0,.6)";
    g.shadowOffsetX = 5;
    g.shadowOffsetY = 5;
    fit(s.title.toUpperCase(), 900, 104, W - 160);
    g.fillText(s.title.toUpperCase(), cx, y);
    g.shadowColor = "transparent";
    y += 130;
    if (s.big) {
      g.shadowColor = "rgba(225,36,47,.7)";
      g.shadowBlur = 40;
      g.font = `900 170px ${COND}`;
      g.fillText(s.big, cx, y + 30);
      g.shadowBlur = 0;
      g.shadowColor = "transparent";
      y += 210;
    }
    g.fillStyle = "rgba(255,255,255,.88)";
    if (s.sub) {
      g.font = `600 44px ${COND}`;
      wrap(s.sub, y, 60, W - 200);
    }
    (s.list ?? []).forEach((line, j) => {
      g.font = `700 46px ${COND}`;
      g.fillText(line, cx, y + j * 74);
    });
    g.restore();

    g.fillStyle = "rgba(255,255,255,.7)";
    g.font = `800 44px ${COND}`;
    g.textAlign = "center";
    g.fillText("#PEURSUM4", cx, H - 110);
  }

  const stream = c.captureStream(FPS);
  const rec = new MediaRecorder(stream, { mimeType: type.mime, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((r) => (rec.onstop = () => r()));

  const total = slides.length * PER;
  frame(0);
  rec.start(500);
  const t0 = performance.now();
  // Op een timer (niet requestAnimationFrame): die loopt ook door als de browser even niet tekent
  await new Promise<void>((resolve) => {
    const tick = setInterval(() => {
      const time = (performance.now() - t0) / 1000;
      frame(Math.min(time, total - 0.01));
      onProgress(Math.min(1, time / total));
      if (time >= total) {
        clearInterval(tick);
        resolve();
      }
    }, 1000 / FPS);
  });
  rec.stop();
  await done;
  stream.getTracks().forEach((t) => t.stop());
  return { blob: new Blob(chunks, { type: type.mime.split(";")[0] }), ext: type.ext };
}
