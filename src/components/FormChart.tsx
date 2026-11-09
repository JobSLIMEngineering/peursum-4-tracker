"use client";

import { useState } from "react";
import type { FormPoint } from "@/lib/domain/insights";
import { fmtDate } from "@/lib/format";

const W = 380;
const H = 230;
const PAD = { l: 26, r: 64, t: 12, b: 24 };
const comma = (x: number, d = 1) => x.toFixed(d).replace(".", ",");

/**
 * Punten door het seizoen: wat we haalden (rood, doorgetrokken) tegenover wat het model verwachtte tegen
 * deze tegenstanders (grijs, gestippeld). Ligt rood erboven, dan doen we het beter dan verwacht.
 * Tik of beweeg over de grafiek voor de wedstrijd op dat moment.
 */
export function FormChart({ points }: { points: FormPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return <p className="meta">Na twee gespeelde wedstrijden verschijnt hier het verloop.</p>;

  const max = Math.max(...points.map((p) => Math.max(p.cumPoints, p.cumExpected)));
  const yMax = Math.ceil(max / 5) * 5 || 5;
  const x = (i: number) => PAD.l + (i / (points.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / yMax) * (H - PAD.t - PAD.b);
  const path = (f: (p: FormPoint) => number) => points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(f(p)).toFixed(1)}`).join("");
  const ticks = Array.from({ length: yMax / 5 + 1 }, (_, i) => i * 5).filter((v, _, a) => a.length <= 6 || v % 10 === 0);
  const last = points.at(-1)!;
  const h = hover ?? null;
  const hp = h !== null ? points[h] : null;

  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };

  return (
    <div className="chart">
      <div className="chart-legend" aria-hidden="true">
        <span>
          <i className="sw us" /> Behaalde punten
        </span>
        <span>
          <i className="sw exp" /> Verwacht
        </span>
      </div>
      <div className="chart-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Punten door het seizoen: ${last.cumPoints} behaald, ${comma(last.cumExpected)} verwacht`}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
        >
          {ticks.map((v) => (
            <g key={v}>
              <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} />
              <text className="tick" x={PAD.l - 8} y={y(v)} textAnchor="end" dominantBaseline="middle">
                {v}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 6) === 0 ? (
              <text key={p.match.id} className="tick" x={x(i)} y={H - 6} textAnchor="middle">
                {p.match.round ?? i + 1}
              </text>
            ) : null,
          )}
          {/* Vlak tussen de lijnen: groen als we boven verwachting zitten, rood eronder */}
          <path
            className={`gap ${last.cumPoints >= last.cumExpected ? "up" : "down"}`}
            d={`${path((p) => p.cumPoints)}${points
              .map((p, i) => i)
              .reverse()
              .map((i) => `L${x(i).toFixed(1)},${y(points[i].cumExpected).toFixed(1)}`)
              .join("")}Z`}
          />
          <path className="line exp" d={path((p) => p.cumExpected)} />
          <path className="line us" d={path((p) => p.cumPoints)} />
          {h !== null && <line className="cross" x1={x(h)} x2={x(h)} y1={PAD.t} y2={H - PAD.b} />}
          {points.map((p, i) => (
            <circle key={p.match.id} className={`dot ${p.points === 3 ? "w" : p.points === 1 ? "d" : "l"}`} cx={x(i)} cy={y(p.cumPoints)} r={h === i ? 6 : 4} />
          ))}
          {/* Labels aan het eind van de lijnen */}
          <text className="end us" x={W - PAD.r + 8} y={y(last.cumPoints)} dominantBaseline="middle">
            {last.cumPoints} pnt
          </text>
          <text className="end exp" x={W - PAD.r + 8} y={y(last.cumExpected) + (Math.abs(y(last.cumExpected) - y(last.cumPoints)) < 14 ? 14 : 0)} dominantBaseline="middle">
            {comma(last.cumExpected)} verw.
          </text>
        </svg>
        {hp && (
          <div className="chart-tip" style={{ left: `${(x(h!) / W) * 100}%` }}>
            <b>
              Ronde {hp.match.round ?? h! + 1} · {hp.opponent}
            </b>
            <span>
              {fmtDate(hp.match.date).full} · {hp.match.home === hp.opponent ? "uit" : "thuis"} · {hp.match.homeGoals}–{hp.match.awayGoals}
            </span>
            <span>
              {hp.points} pnt, verwacht {comma(hp.expected)}
            </span>
          </div>
        )}
      </div>
      <p className="meta" style={{ margin: "8px 0 0" }}>
        Horizontaal: speelronde. Verwacht = wat het model gemiddeld had verwacht tegen deze tegenstanders, thuis of uit.
      </p>
    </div>
  );
}
