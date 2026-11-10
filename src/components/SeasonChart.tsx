"use client";

import { useMemo, useState } from "react";
import type { FormPoint } from "@/lib/domain/insights";
import type { MatchEntry } from "@/lib/domain/types";
import { fmtDate } from "@/lib/format";

const W = 380;
const H = 230;
const PAD = { l: 28, r: 66, t: 12, b: 24 };
const comma = (x: number, d = 1) => x.toFixed(d).replace(".", ",");

interface Line {
  label: string;
  /** "us" = rood doorgetrokken, "exp" = grijs gestippeld */
  kind: "us" | "exp";
  values: (number | null)[];
  /** Kort label aan het eind van de lijn */
  end: (v: number) => string;
}

interface Metric {
  key: string;
  label: string;
  /** Uitleg onder de grafiek */
  note: string;
  lines: Line[];
  /** Nullijn tonen (bij plus/min-waarden) */
  zero?: boolean;
  /** Bij plus/min: vlak groen boven nul, rood eronder */
  signed?: boolean;
  /** Regel in de tip bij een wedstrijd */
  tip: (i: number) => string;
}

const cum = (xs: number[]) => xs.reduce<number[]>((a, x) => [...a, (a.at(-1) ?? 0) + x], []);

/**
 * Het seizoen in één grafiek, met keuze wat je ziet: punten, vorm, aanval en verdediging (steeds
 * tegenover wat het model verwachtte tegen deze tegenstanders, dus eerlijk voor de sterkte van de
 * tegenstander), opkomst en blessures. Tik of beweeg over de grafiek voor de wedstrijd op dat moment.
 */
export function SeasonChart({ points, entries, showInjuries }: { points: FormPoint[]; entries: Record<string, MatchEntry>; showInjuries: boolean }) {
  const metrics = useMemo<Metric[]>(() => {
    const e = (i: number) => entries[points[i].match.id];
    const list: Metric[] = [
      {
        key: "punten",
        label: "Punten",
        note: "Behaalde punten tegenover wat het model verwachtte tegen deze tegenstanders, opgeteld.",
        lines: [
          { label: "Behaald", kind: "us", values: points.map((p) => p.cumPoints), end: (v) => `${v} pnt` },
          { label: "Verwacht", kind: "exp", values: points.map((p) => p.cumExpected), end: (v) => `${comma(v)} verw.` },
        ],
        tip: (i) => `${points[i].points} pnt, verwacht ${comma(points[i].expected)}`,
      },
      {
        key: "vorm",
        label: "Vorm",
        note: "Punten per duel boven (+) of onder (−) verwachting, gemiddeld over de laatste 5. Schommelt niet per week.",
        zero: true,
        signed: true,
        lines: [{ label: "Vorm", kind: "us", values: points.map((p) => p.form), end: (v) => `${v >= 0 ? "+" : ""}${comma(v)}` }],
        tip: (i) => `vorm ${points[i].form >= 0 ? "+" : ""}${comma(points[i].form)} per duel`,
      },
      {
        key: "aanval",
        label: "Aanval",
        note: "Gemaakte goals tegenover verwachte goals (hoe sterk de tegenstander verdedigt), opgeteld. Boven = scoren beter dan verwacht.",
        lines: [
          { label: "Gescoord", kind: "us", values: cum(points.map((p) => p.goalsFor)), end: (v) => `${v} goals` },
          { label: "Verwacht", kind: "exp", values: cum(points.map((p) => p.xgFor)), end: (v) => `${comma(v)} verw.` },
        ],
        tip: (i) => `${points[i].goalsFor} gescoord, verwacht ${comma(points[i].xgFor)}`,
      },
      {
        key: "verdediging",
        label: "Verdediging",
        note: "Tegengoals tegenover verwacht (hoe sterk de tegenstander aanvalt), opgeteld. Onder de grijze lijn = beter dan verwacht.",
        lines: [
          { label: "Tegen", kind: "us", values: cum(points.map((p) => p.goalsAgainst)), end: (v) => `${v} tegen` },
          { label: "Verwacht", kind: "exp", values: cum(points.map((p) => p.xgAgainst)), end: (v) => `${comma(v)} verw.` },
        ],
        tip: (i) => `${points[i].goalsAgainst} tegen, verwacht ${comma(points[i].xgAgainst)}`,
      },
      {
        key: "opkomst",
        label: "Opkomst",
        note: "Aantal spelers per wedstrijd (alleen ingevoerde wedstrijden).",
        lines: [{ label: "Aanwezig", kind: "us", values: points.map((_, i) => e(i)?.attendance.length ?? null), end: (v) => `${v} spelers` }],
        tip: (i) => (e(i) ? `${e(i)!.attendance.length} spelers aanwezig` : "niet ingevoerd"),
      },
    ];
    if (showInjuries)
      list.push({
        key: "blessures",
        label: "Blessures",
        note: "Aantal geblesseerde spelers per wedstrijd (alleen zichtbaar als je bent ingelogd).",
        lines: [{ label: "Geblesseerd", kind: "us", values: points.map((_, i) => (e(i) ? (e(i)!.injured?.length ?? 0) : null)), end: (v) => `${v} geblesseerd` }],
        tip: (i) => (e(i) ? `${e(i)!.injured?.length ?? 0} geblesseerd` : "niet ingevoerd"),
      });
    return list;
  }, [points, entries, showInjuries]);

  const [key, setKey] = useState("punten");
  const [hover, setHover] = useState<number | null>(null);
  const m = metrics.find((x) => x.key === key) ?? metrics[0];
  if (points.length < 2) return <p className="meta">Na twee gespeelde wedstrijden verschijnt hier het verloop.</p>;

  const all = m.lines.flatMap((l) => l.values.filter((v): v is number => v != null));
  const lo = m.zero ? Math.min(0, ...all) : 0;
  const hiRaw = Math.max(...all, m.zero ? 0 : 1);
  const step = hiRaw - lo > 20 ? 10 : hiRaw - lo > 8 ? 5 : hiRaw - lo > 3 ? 1 : 0.5;
  const yMin = Math.floor(lo / step) * step;
  const yMax = Math.ceil(hiRaw / step) * step || step;
  const x = (i: number) => PAD.l + (i / (points.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);
  const path = (vs: (number | null)[]) =>
    vs
      .map((v, i) => (v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`))
      .reduce<string>((d, pt, i) => (pt == null ? d : `${d}${d && vs[i - 1] != null ? "L" : "M"}${pt}`), "");
  const ticks: number[] = [];
  for (let v = yMin; v <= yMax + 1e-9; v += step) ticks.push(Math.round(v * 10) / 10);
  const shown = ticks.length > 6 ? ticks.filter((_, i) => i % 2 === 0) : ticks;
  const us = m.lines[0];
  const exp = m.lines.find((l) => l.kind === "exp");
  const lastIdx = (vs: (number | null)[]) => vs.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0).at(-1) ?? 0;

  const pick = (ev: React.PointerEvent<SVGSVGElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };
  const hp = hover != null ? points[hover] : null;

  return (
    <div className="chart">
      <div className="chart-pick" role="tablist" aria-label="Wat wil je zien?">
        {metrics.map((x) => (
          <button key={x.key} type="button" role="tab" aria-selected={x.key === m.key} onClick={() => setKey(x.key)}>
            {x.label}
          </button>
        ))}
      </div>
      {m.lines.length > 1 && (
        <div className="chart-legend" aria-hidden="true">
          {m.lines.map((l) => (
            <span key={l.label}>
              <i className={`sw ${l.kind}`} /> {l.label}
            </span>
          ))}
        </div>
      )}
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${m.label} door het seizoen`} onPointerMove={pick} onPointerDown={pick} onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}>
          {shown.map((v) => (
            <g key={v}>
              <line className={`grid ${m.zero && v === 0 ? "zero" : ""}`} x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} />
              <text className="tick" x={PAD.l - 6} y={y(v)} textAnchor="end" dominantBaseline="middle">
                {String(v).replace(".", ",")}
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
          {exp && (
            <path
              className={`gap ${(us.values[lastIdx(us.values)] ?? 0) >= (exp.values[lastIdx(exp.values)] ?? 0) !== (m.key === "verdediging") ? "up" : "down"}`}
              d={`${path(us.values)}${exp.values
                .map((v, i) => [v, i] as const)
                .reverse()
                .map(([v, i]) => (v == null ? "" : `L${x(i).toFixed(1)},${y(v).toFixed(1)}`))
                .join("")}Z`}
            />
          )}
          {m.signed && <path className="gap up" d={`${path(us.values.map((v) => (v == null ? null : Math.max(0, v))))}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z`} />}
          {m.signed && <path className="gap down" d={`${path(us.values.map((v) => (v == null ? null : Math.min(0, v))))}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z`} />}
          {m.lines
            .slice()
            .reverse()
            .map((l) => (
              <path key={l.label} className={`line ${l.kind}`} d={path(l.values)} />
            ))}
          {hover != null && <line className="cross" x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} />}
          {us.values.map((v, i) =>
            v == null ? null : (
              <circle key={i} className={`dot ${m.key === "punten" ? (points[i].points === 3 ? "w" : points[i].points === 1 ? "d" : "l") : "n"}`} cx={x(i)} cy={y(v)} r={hover === i ? 6 : 4} />
            ),
          )}
          {m.lines.map((l, j) => {
            const li = lastIdx(l.values);
            const v = l.values[li];
            if (v == null) return null;
            const other = m.lines[1 - j]?.values[lastIdx(m.lines[1 - j]?.values ?? [])];
            const nudge = j === 1 && other != null && Math.abs(y(v) - y(other)) < 14 ? 14 : 0;
            return (
              <text key={l.label} className={`end ${l.kind}`} x={W - PAD.r + 8} y={y(v) + nudge} dominantBaseline="middle">
                {l.end(v)}
              </text>
            );
          })}
        </svg>
        {hp && (
          <div className="chart-tip" style={{ left: `${(x(hover!) / W) * 100}%` }}>
            <b>
              Ronde {hp.match.round ?? hover! + 1} · {hp.opponent}
            </b>
            <span>
              {fmtDate(hp.match.date).full} · {hp.match.home === hp.opponent ? "uit" : "thuis"} · {hp.match.homeGoals}–{hp.match.awayGoals}
            </span>
            <span>{m.tip(hover!)}</span>
          </div>
        )}
      </div>
      <p className="meta" style={{ margin: "8px 0 0" }}>
        {m.note} Horizontaal: speelronde.
      </p>
    </div>
  );
}
