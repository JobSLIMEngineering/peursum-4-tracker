"use client";

import { useMemo, useState } from "react";
import { positionHistory, shortTeam } from "@/lib/domain/positions";
import { US } from "@/lib/domain/types";
import { todayNL } from "@/lib/format";
import type { AppView } from "@/lib/store/view";
import { InfoTip } from "./InfoTip";
import { Box } from "./ui";

const W = 380;
const ROW = 18;
const PAD = { l: 22, r: 92, t: 10, b: 22 };

/**
 * Verloop van de stand: per speelronde de plek van elk team. Peursum in rood; tik op een team om
 * zijn lijn op te lichten (nog eens tikken haalt hem weg).
 */
export function PositionChart({ view }: { view: AppView }) {
  const h = useMemo(
    () => positionHistory(view.matches, view.standings, todayNL()),
    [view.matches, view.standings],
  );
  const [picked, setPicked] = useState<string[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const n = h.teams.length;
  if (h.rounds.length < 2 || n < 2) return null;

  const H = PAD.t + (n - 1) * ROW + PAD.b;
  const last = h.rounds.length - 1;
  const x = (i: number) => PAD.l + (i / last) * (W - PAD.l - PAD.r);
  const y = (pos: number) => PAD.t + (pos - 1) * ROW;
  const path = (ps: number[]) =>
    ps
      .map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p).toFixed(1)}`)
      .join("");
  const toggle = (team: string) =>
    setPicked((p) =>
      p.includes(team) ? p.filter((t) => t !== team) : [...p, team],
    );
  const state = (team: string) =>
    team === US
      ? "us"
      : picked.includes(team)
        ? "on"
        : picked.length
          ? "off"
          : "";
  // Opgelichte lijnen bovenop, Peursum helemaal bovenaan
  const rank = (team: string) =>
    ({ us: 2, on: 1 })[state(team) as "us" | "on"] ?? 0;
  const order = [...h.teams].sort((a, b) => rank(a.team) - rank(b.team));
  const step = Math.ceil(h.rounds.length / 8);

  const pick = (ev: React.PointerEvent<SVGSVGElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * W;
    if (px > W - PAD.r + 4) return;
    setHover(
      Math.max(
        0,
        Math.min(last, Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * last)),
      ),
    );
  };
  const hoverRows =
    hover == null
      ? null
      : [...h.teams].sort((a, b) => a.positions[hover] - b.positions[hover]);

  return (
    <Box
      label="Verloop van de stand"
      right={
        <InfoTip label="Hoe werkt dit?">
          De plek van elk team na elke speelronde, uitgerekend uit de uitslagen
          (punten, dan doelsaldo, dan gemaakte goals). Inhaalwedstrijden tellen
          mee vanaf hun datum. De laatste ronde is de echte stand. Tik op een
          teamnaam om zijn lijn op te lichten.
        </InfoTip>
      }
    >
      <div className="chart pos-chart">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Plek per speelronde van alle teams"
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
        >
          {h.teams.map((_, i) => (
            <g key={i}>
              <line
                className="grid"
                x1={PAD.l}
                x2={W - PAD.r}
                y1={y(i + 1)}
                y2={y(i + 1)}
              />
              <text
                className="tick"
                x={PAD.l - 6}
                y={y(i + 1)}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {i + 1}
              </text>
            </g>
          ))}
          {h.rounds.map((r, i) =>
            i === 0 || i === last || i % step === 0 ? (
              <text
                key={r.round}
                className="tick"
                x={x(i)}
                y={H - 6}
                textAnchor="middle"
              >
                {r.round}
              </text>
            ) : null,
          )}
          {hover != null && (
            <line
              className="cross"
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.t - 6}
              y2={H - PAD.b + 6}
            />
          )}
          {order.map((t) => (
            <g
              key={t.team}
              className={`pos-line ${state(t.team)}`}
              onClick={() => toggle(t.team)}
            >
              <path d={path(t.positions)} />
              {t.positions.map((p, i) => (
                <circle key={i} cx={x(i)} cy={y(p)} r={hover === i ? 4.5 : 3} />
              ))}
            </g>
          ))}
          {h.teams.map((t) => (
            <text
              key={t.team}
              className={`pos-name ${state(t.team)}`}
              x={W - PAD.r + 8}
              y={y(t.positions[last])}
              dominantBaseline="middle"
              onClick={() => toggle(t.team)}
            >
              {shortTeam(t.team)}
            </text>
          ))}
        </svg>
      </div>
      <div className="chart-tip pos-tip" aria-live="polite">
        {hoverRows ? (
          <>
            <b>Na ronde {h.rounds[hover!].round}</b>
            <span>
              {hoverRows
                .filter(
                  (t) =>
                    t.team === US ||
                    picked.includes(t.team) ||
                    t.positions[hover!] <= 3,
                )
                .map((t) => `${t.positions[hover!]}. ${shortTeam(t.team)}`)
                .join(" · ")}
            </span>
          </>
        ) : (
          <span>
            Tik op de grafiek voor de stand na een ronde, of op een team om het
            op te lichten.
          </span>
        )}
      </div>
    </Box>
  );
}
