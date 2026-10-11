"use client";

import { useState } from "react";
import { normName } from "@/lib/domain/attendance";
import { lastMatches, leaders, playerTotals } from "@/lib/domain/stats";
import { opponent, outcome, playerLabel, US, type Match } from "@/lib/domain/types";
import { DAY_FULL, MON_FULL } from "@/lib/format";
import { standingOf, type AppView } from "@/lib/store/view";

const W = 1080;
const H = 1350;

/** Matchday-post 1080 × 1350 in de app-stijl, zonder winkans (PLAN.md §6, drawShare() in het prototype). */
async function drawShare(view: AppView, n: Match): Promise<HTMLCanvasElement> {
  const css = getComputedStyle(document.documentElement);
  const fam = (v: string, fb: string) => `${css.getPropertyValue(v).trim() || ""}, ${fb}`.replace(/^, /, "");
  const AN = fam("--font-anton", "Impact, sans-serif");
  const BC = fam("--font-barlow-cond", "'Arial Narrow', sans-serif");
  try {
    await Promise.all([`400 120px ${AN}`, `800 40px ${BC}`, `700 30px ${BC}`].map((f) => document.fonts.load(f)));
  } catch {
    // lettertypes niet geladen: canvas valt terug op systeemfonts
  }

  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;

  const spaced = (t: string, x: number, y: number, ls: number, align: "left" | "center" | "right" = "left") => {
    g.textAlign = "left";
    let w = 0;
    for (const ch of t) w += g.measureText(ch).width + ls;
    w -= ls;
    let sx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    for (const ch of t) {
      g.fillText(ch, sx, y);
      sx += g.measureText(ch).width + ls;
    }
  };
  const fit = (t: string, font: (s: number) => string, size: number, max: number) => {
    let s = size;
    do {
      g.font = font(s);
      s -= 4;
    } while (g.measureText(t).width > max && s > 30);
  };

  // Achtergrond
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#160a0c");
  bg.addColorStop(1, "#0b0909");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  // Rood blok met schuine onderkant en donkere banen
  g.save();
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(W, 0);
  g.lineTo(W, 560);
  g.lineTo(0, 640);
  g.closePath();
  g.clip();
  g.fillStyle = "#e1242f";
  g.fillRect(0, 0, W, 700);
  g.fillStyle = "rgba(0,0,0,.16)";
  g.beginPath();
  g.moveTo(640, 0);
  g.lineTo(1000, 0);
  g.lineTo(760, 700);
  g.lineTo(400, 700);
  g.closePath();
  g.fill();
  g.fillStyle = "rgba(0,0,0,.10)";
  g.beginPath();
  g.moveTo(1040, 0);
  g.lineTo(1100, 0);
  g.lineTo(860, 700);
  g.lineTo(800, 700);
  g.closePath();
  g.fill();
  g.restore();

  // Kop
  g.fillStyle = "rgba(255,255,255,.85)";
  g.font = `700 30px ${BC}`;
  spaced("MATCHDAY", 80, 110, 10);
  const dt = new Date(`${n.date}T12:00`);
  g.fillStyle = "#fff";
  g.font = `800 34px ${BC}`;
  spaced(
    `${DAY_FULL[dt.getDay()]} ${dt.getDate()} ${MON_FULL[dt.getMonth()]}`.toUpperCase() + (n.time ? `  ·  ${n.time}` : ""),
    80,
    160,
    6,
  );

  const teamLine = (name: string, y: number) => {
    g.save();
    g.translate(80, y);
    g.transform(1, 0, -0.12, 1, 0, 0);
    g.fillStyle = "rgba(0,0,0,.25)";
    fit(name.toUpperCase(), (s) => `400 ${s}px ${AN}`, 128, 880);
    g.fillText(name.toUpperCase(), 6, 6);
    g.fillStyle = "#fff";
    g.fillText(name.toUpperCase(), 0, 0);
    g.restore();
  };
  teamLine(n.home, 300);
  g.fillStyle = "#0d0b0c";
  g.save();
  g.translate(80, 340);
  g.transform(1, 0, -0.15, 1, 0, 0);
  g.fillRect(0, 0, 120, 70);
  g.restore();
  g.fillStyle = "#fff";
  g.font = `400 52px ${AN}`;
  g.textAlign = "center";
  g.fillText("VS", 132, 397);
  g.textAlign = "left";
  teamLine(n.away, 520);

  // Statistiektabel
  const opp = opponent(n);
  const u = standingOf(view, US);
  const o = standingOf(view, opp);
  const top = 680;
  const rh = 62;
  const x1 = 600;
  const x2 = 880;
  if (u && o) {
    const per = (a: number, b: number) => (b ? (a / b).toFixed(1) : "–");
    const rows: [string, string | number, string | number][] = [
      ["Positie", `${u.position}e`, `${o.position}e`],
      ["Punten", u.points, o.points],
      ["Gespeeld", u.played, o.played],
      ["W · G · V", `${u.won} · ${u.drawn} · ${u.lost}`, `${o.won} · ${o.drawn} · ${o.lost}`],
      ["Goals voor p/w", per(u.goalsFor, u.played), per(o.goalsFor, o.played)],
      ["Goals tegen p/w", per(u.goalsAgainst, u.played), per(o.goalsAgainst, o.played)],
    ];
    g.fillStyle = "#e1242f";
    g.font = `800 26px ${BC}`;
    g.textAlign = "center";
    g.fillText("PEURSUM 4", x1, top);
    g.fillStyle = "#bfb3b6";
    fit(opp.toUpperCase(), (s) => `800 ${s}px ${BC}`, 26, 220);
    g.fillText(opp.toUpperCase(), x2, top);
    rows.forEach((r, i) => {
      const y = top + 40 + i * rh;
      g.fillStyle = i % 2 ? "rgba(255,255,255,0)" : "rgba(255,255,255,.04)";
      g.fillRect(60, y, W - 120, rh);
      g.textAlign = "left";
      g.fillStyle = "#bfb3b6";
      g.font = `700 28px ${BC}`;
      spaced(r[0].toUpperCase(), 90, y + 41, 3);
      g.textAlign = "center";
      g.font = `400 42px ${AN}`;
      g.fillStyle = "#fff";
      g.fillText(String(r[1]), x1, y + 46);
      g.fillStyle = "#d8cfd1";
      g.fillText(String(r[2]), x2, y + 46);
    });
  }

  // Vorm + topscorer
  const fy = top + 40 + 6 * rh + 20;
  const form = lastMatches(view.matches, US).reverse();
  g.textAlign = "left";
  g.fillStyle = "#bfb3b6";
  g.font = `700 26px ${BC}`;
  spaced("VORM PEURSUM 4", 90, fy + 30, 4);
  form.forEach((m, i) => {
    const r = outcome(m.goalsFor, m.goalsAgainst);
    g.fillStyle = r === "W" ? "#2fbf62" : r === "D" ? "#f0b429" : "#e5484d";
    g.save();
    g.translate(90 + i * 70, fy + 50);
    g.transform(1, 0, -0.15, 1, 0, 0);
    g.fillRect(0, 0, 58, 52);
    g.restore();
    g.fillStyle = "#0d0b0c";
    g.font = `400 34px ${AN}`;
    g.textAlign = "center";
    g.fillText(r === "D" ? "G" : r === "L" ? "V" : "W", 90 + i * 70 + 25, fy + 90);
    g.textAlign = "left";
  });

  const totals = playerTotals(view.players, view.matches, Object.values(view.entries));
  const best = leaders(view.players, totals, "goals");
  if (best.value) {
    const who = best.players.map(playerLabel).join(", ");
    g.fillStyle = "#bfb3b6";
    g.font = `700 26px ${BC}`;
    spaced("TOPSCORER", 600, fy + 30, 4);
    g.fillStyle = "#fff";
    fit(who.toUpperCase(), (s) => `800 ${s}px ${BC}`, 36, 330);
    g.fillText(who.toUpperCase(), 600, fy + 80);
    g.fillStyle = "#e1242f";
    g.font = `400 40px ${AN}`;
    g.fillText(`${best.value} goals`, 600, fy + 125);
  }

  // Voet
  g.fillStyle = "#e1242f";
  g.fillRect(0, H - 70, W, 70);
  g.fillStyle = "#fff";
  g.font = `800 28px ${BC}`;
  g.textAlign = "left";
  spaced((n.venue ?? "").toUpperCase(), 80, H - 26, 4);
  g.textAlign = "right";
  g.font = `400 34px ${AN}`;
  g.fillText("#PEURSUM4", W - 80, H - 22);
  return c;
}

export function SharePost({ view, match }: { view: AppView; match: Match }) {
  const [img, setImg] = useState<{ url: string; blob: Blob } | null>(null);
  const [msg, setMsg] = useState("");
  const filename = `peursum4-vs-${normName(opponent(match)).replace(/[^a-z0-9]+/g, "-")}.png`;

  async function open() {
    const canvas = await drawShare(view, match);
    const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), "image/png"));
    setImg({ url: URL.createObjectURL(blob), blob });
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
    // Laptop: gewoon downloaden
    const a = document.createElement("a");
    a.href = img.url;
    a.download = filename;
    a.click();
    setMsg("Opgeslagen in je downloads.");
  }

  if (!img) {
    return (
      <div className="actions" style={{ margin: "0 0 14px" }}>
        <button className="btn primary" type="button" onClick={open}>
          Delen als post
        </button>
      </div>
    );
  }

  return (
    <section className="box share" style={{ marginBottom: 14 }}>
      <div className="box-h">
        <p className="lbl">Matchday-post</p>
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
        <img src={img.url} alt={`Matchday-post Peursum 4 tegen ${opponent(match)}`} />
        <div className="share-side">
          <p className="meta" style={{ margin: 0 }}>
            Formaat 1080 × 1350, past in een Instagram-post. Met stand, vorm en goals per wedstrijd; zonder winkans.
          </p>
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
