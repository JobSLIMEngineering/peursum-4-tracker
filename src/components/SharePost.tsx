"use client";

import { useState } from "react";
import { normName } from "@/lib/domain/attendance";
import { isPlayed, opponent, playerLabel, US, type Match } from "@/lib/domain/types";
import { BASE } from "@/lib/base";
import { DAY_FULL, MON_FULL } from "@/lib/format";
import { canvasLogoSrc } from "@/lib/logos";
import { standingOf, type AppView } from "@/lib/store/view";

type Format = "post" | "story";
const SIZE: Record<Format, [number, number]> = { post: [1080, 1350], story: [1080, 1920] };

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

/**
 * Deelpost in de stijl van de Instagram-posts van Peursum 4 (MATCHDAY of UITSLAG):
 * zwart met rode vonken, penseeltitel met rode streek, grote wapens, score in penseelletters.
 */
async function draw(view: AppView, m: Match, format: Format): Promise<HTMLCanvasElement> {
  const [W, H] = SIZE[format];
  const css = getComputedStyle(document.documentElement);
  const BRUSH = `${css.getPropertyValue("--font-marker").trim()}, Impact, sans-serif`;
  const COND = `${css.getPropertyValue("--font-barlow-cond").trim()}, 'Arial Narrow', sans-serif`;
  try {
    await Promise.all([`400 200px ${BRUSH}`, `800 60px ${COND}`, `700 40px ${COND}`].map((f) => document.fonts.load(f)));
  } catch {
    // systeemletters als het niet lukt
  }
  const [texture, brush, homeLogo, awayLogo] = await Promise.all([
    loadImage(`${BASE}/texture.jpg`),
    loadImage(`${BASE}/brush.png`),
    ...[m.home, m.away].map((t) => {
      const src = canvasLogoSrc(t, view.logos);
      return src ? loadImage(src) : Promise.resolve(null);
    }),
  ]);

  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const played = isPlayed(m);
  const story = format === "story";
  const cx = W / 2;

  // Achtergrond: textuur (cover)
  g.fillStyle = "#060404";
  g.fillRect(0, 0, W, H);
  if (texture) {
    const s = Math.max(W / texture.width, H / texture.height);
    g.drawImage(texture, (W - texture.width * s) / 2, (H - texture.height * s) / 2, texture.width * s, texture.height * s);
  }

  const shadowed = (fn: () => void, blur = 0, off = 6) => {
    g.save();
    g.shadowColor = "rgba(0,0,0,.65)";
    g.shadowBlur = blur;
    g.shadowOffsetX = off;
    g.shadowOffsetY = off;
    fn();
    g.restore();
  };
  const spaced = (t: string, x: number, y: number, ls: number) => {
    let w = 0;
    for (const ch of t) w += g.measureText(ch).width + ls;
    w -= ls;
    let sx = x - w / 2;
    g.textAlign = "left";
    for (const ch of t) {
      g.fillText(ch, sx, y);
      sx += g.measureText(ch).width + ls;
    }
  };
  const fitFont = (t: string, font: (px: number) => string, px: number, max: number) => {
    do {
      g.font = font(px);
      px -= 4;
    } while (g.measureText(t).width > max && px > 20);
  };

  // Doelpunten (alleen bij uitslag), in volgorde van invoer
  const e = played ? view.entries[m.id] : undefined;
  const name = (id: string | null | undefined) => playerLabel(view.players.find((p) => p.id === id));
  const goals: { scorer: string; tag: string | null; assist: string | null }[] = e?.goals
    ? e.goals.map((x) => ({
        scorer: x.scorerId ? name(x.scorerId) : "Eigen goal tegenstander",
        tag: x.kind === "penalty" ? "P" : x.kind === "vrije trap" ? "FK" : null,
        assist: x.scorerId && x.assistId ? name(x.assistId) : null,
      }))
    : Object.entries(e?.stats ?? {})
        .filter(([, st]) => st.goals)
        .flatMap(([id, st]) => Array.from({ length: st.goals }, () => ({ scorer: name(id), tag: null, assist: null })));

  // Indeling: bij een uitslag met doelpunten alles wat hoger, zodat de lijst past
  const lift = played && goals.length ? 1 : 0;
  const shift = story ? 260 : 0;
  const titleY = (lift ? 200 : 250) + shift;
  const rowY = (lift ? 600 : 720) + shift + (story && lift ? 40 : 0);
  const logoSize = lift ? 250 : 300;

  // Titel met rode penseelstreek
  const title = played ? "UITSLAG" : "MATCHDAY";
  g.save();
  g.translate(cx, titleY);
  g.rotate(-0.05);
  if (brush) g.drawImage(brush, -430, 20, 860, 90);
  g.font = `400 ${played ? 190 : 165}px ${BRUSH}`;
  g.textAlign = "center";
  shadowed(() => {
    g.fillStyle = "#f4f1f1";
    g.fillText(title, 0, 40);
  });
  g.restore();

  // Datum en tijd
  const dt = m.date ? new Date(`${m.date}T12:00`) : null;
  const when = dt
    ? `${DAY_FULL[dt.getDay()]} ${dt.getDate()} ${MON_FULL[dt.getMonth()]}`.toUpperCase() + (m.time && !played ? `  ·  ${m.time}` : "")
    : "DATUM VOLGT";
  g.fillStyle = "#e9e5e5";
  g.font = `700 40px ${COND}`;
  spaced(when, cx, titleY + 160, 8);

  // Wapens met namen (en bij matchday de stand eronder), score of VS in het midden
  const sideX = [cx - 300, cx + 300];
  [homeLogo, awayLogo].forEach((img, i) => {
    if (!img) return;
    const sc = logoSize / Math.max(img.width, img.height);
    const w = img.width * sc;
    const h = img.height * sc;
    shadowed(() => g.drawImage(img, sideX[i] - w / 2, rowY - h / 2 - 30, w, h), 30, 0);
  });
  const nameY = rowY + logoSize / 2 + 40;
  [m.home, m.away].forEach((team, i) => {
    g.fillStyle = "#f1eded";
    fitFont(team.toUpperCase(), (px) => `800 ${px}px ${COND}`, 50, 420);
    g.textAlign = "center";
    shadowed(() => g.fillText(team.toUpperCase(), sideX[i], nameY), 0, 3);
    if (!played) {
      const st = standingOf(view, team);
      if (st) {
        g.fillStyle = "#e1242f";
        g.font = `800 34px ${COND}`;
        spaced(`${st.position}E IN DE STAND`, sideX[i], nameY + 52, 4);
      }
    }
  });

  g.save();
  g.translate(cx, rowY);
  g.rotate(-0.05);
  g.textAlign = "center";
  if (played) {
    const color = (team: string) => (team === US ? "#f4f1f1" : "#e1242f");
    g.font = `400 ${lift ? 200 : 230}px ${BRUSH}`;
    const parts: [string, string][] = [
      [String(m.homeGoals), color(m.home)],
      ["-", "#e1242f"],
      [String(m.awayGoals), color(m.away)],
    ];
    const widths = parts.map(([t]) => g.measureText(t).width);
    let x = -widths.reduce((a, b) => a + b, 0) / 2;
    parts.forEach(([t, col], i) => {
      g.textAlign = "left";
      shadowed(() => {
        g.fillStyle = col;
        g.fillText(t, x, 60);
      });
      x += widths[i];
    });
  } else {
    g.font = `400 150px ${BRUSH}`;
    shadowed(() => {
      g.fillStyle = "#e1242f";
      g.fillText("VS", 0, 50);
    });
  }
  g.restore();

  // Doelpunten onder elkaar: naam, P/FK-label, assist klein erachter
  if (goals.length) {
    const top = nameY + 90;
    const bottom = H - 180;
    const lineH = Math.min(56, (bottom - top) / goals.length);
    const big = Math.min(40, lineH * 0.75);
    const small = Math.round(big * 0.7);
    goals.forEach((x, i) => {
      const y = top + lineH * (i + 0.8);
      g.font = `800 ${big}px ${COND}`;
      const wName = g.measureText(x.scorer.toUpperCase()).width;
      const wTag = x.tag ? (g.font = `800 ${small}px ${COND}`, g.measureText(x.tag).width + 20) : 0;
      g.font = `600 ${small}px ${COND}`;
      const aText = x.assist ? `assist ${x.assist}` : "";
      const wAss = x.assist ? g.measureText(aText).width : 0;
      let px = cx - (wName + (wTag ? wTag + 12 : 0) + (wAss ? wAss + 16 : 0)) / 2;
      g.textAlign = "left";
      g.font = `800 ${big}px ${COND}`;
      g.fillStyle = x.scorer.startsWith("Eigen goal") ? "#bfb3b6" : "#f4f1f1";
      shadowed(() => g.fillText(x.scorer.toUpperCase(), px, y), 0, 2);
      px += wName + 12;
      if (x.tag) {
        g.fillStyle = "#e1242f";
        g.fillRect(px, y - small - 2, wTag, small + 10);
        g.fillStyle = "#ffffff";
        g.font = `800 ${small}px ${COND}`;
        g.fillText(x.tag, px + 10, y);
        px += wTag + 16;
      }
      if (x.assist) {
        g.fillStyle = "#a99ea1";
        g.font = `600 ${small}px ${COND}`;
        g.fillText(aText, px, y);
      }
    });
  }

  // Voet: sportpark en hashtag
  g.fillStyle = "#e1242f";
  g.fillRect(cx - 60, H - 150, 120, 5);
  g.fillStyle = "#d8cfd1";
  g.font = `700 32px ${COND}`;
  spaced((m.venue ?? "").toUpperCase(), cx, H - 95, 5);
  g.fillStyle = "#ffffff";
  g.font = `400 46px ${BRUSH}`;
  g.textAlign = "center";
  g.fillText("#PEURSUM4", cx, H - 40);
  return c;
}

export function SharePost({ view, match }: { view: AppView; match: Match }) {
  const [img, setImg] = useState<{ url: string; blob: Blob; format: Format } | null>(null);
  const [msg, setMsg] = useState("");
  const played = isPlayed(match);
  const filename = `peursum4-${played ? "uitslag" : "matchday"}-${normName(opponent(match)).replace(/[^a-z0-9]+/g, "-")}.png`;

  async function make(format: Format) {
    if (img) URL.revokeObjectURL(img.url);
    const canvas = await draw(view, match, format);
    const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), "image/png"));
    setImg({ url: URL.createObjectURL(blob), blob, format });
    setMsg("");
  }

  async function share() {
    if (!img) return;
    const file = new File([img.blob], filename, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `Peursum 4 – ${opponent(match)}` });
        setMsg("Gedeeld.");
      } catch {
        setMsg("Niet gedeeld.");
      }
      return;
    }
    const a = document.createElement("a");
    a.href = img.url;
    a.download = filename;
    a.click();
    setMsg("Opgeslagen in je downloads.");
  }

  if (!img) {
    return (
      <div className="actions" style={{ margin: "0 0 14px" }}>
        <button className="btn primary" type="button" onClick={() => make("post")}>
          {played ? "Deel uitslag" : "Delen als post"}
        </button>
      </div>
    );
  }

  return (
    <section className="box share" style={{ marginBottom: 14 }}>
      <div className="box-h">
        <p className="lbl">{played ? "Uitslag-post" : "Matchday-post"}</p>
        <button
          className="btn sm"
          type="button"
          onClick={() => {
            URL.revokeObjectURL(img.url);
            setImg(null);
          }}
        >
          Sluiten
        </button>
      </div>
      <div className="box-b share-b">
        {/* eslint-disable-next-line @next/next/no-img-element -- lokaal gegenereerde afbeelding (blob-URL) */}
        <img src={img.url} alt={`${played ? "Uitslag" : "Matchday"}-post Peursum 4 tegen ${opponent(match)}`} />
        <div className="share-side">
          <div className="seg" role="group" aria-label="Formaat">
            <button type="button" aria-pressed={img.format === "post"} onClick={() => make("post")}>
              Post 4:5
            </button>
            <button type="button" aria-pressed={img.format === "story"} onClick={() => make("story")}>
              Story 9:16
            </button>
          </div>
          <p className="meta">In de stijl van de Instagram van Peursum 4. Zonder winkans.</p>
          <div className="actions">
            <button className="btn primary" type="button" onClick={share}>
              Delen of opslaan
            </button>
          </div>
          {msg && (
            <p className="meta" style={{ margin: "8px 0 0" }}>
              {msg}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
