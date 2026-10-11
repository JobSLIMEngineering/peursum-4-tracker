"use client";

import { useEffect, useState } from "react";
import { simulateSeason, type SeasonOutlook } from "@/lib/domain/season";
import { US } from "@/lib/domain/types";
import { pct } from "@/lib/format";
import type { AppView } from "@/lib/store/view";
import { TeamLogo } from "./TeamLogo";
import { Box } from "./ui";

/** Kampioenskans van Peursum 4 en de concurrenten (5.000 keer het restant van het seizoen naspelen) */
export function ChampionChance({ view }: { view: AppView }) {
  const [out, setOut] = useState<SeasonOutlook | null>(null);

  // Na het tonen van het scherm rekenen, zodat de app niet hapert
  useEffect(() => {
    const t = setTimeout(() => setOut(simulateSeason(view.model, view.standings, view.matches, 5000)), 50);
    return () => clearTimeout(t);
  }, [view]);

  if (!out) {
    return (
      <Box label="Kampioenskans">
        <span className="meta">Seizoen wordt doorgerekend…</span>
      </Box>
    );
  }

  const top = Object.entries(out.champion)
    .filter(([team, p]) => team === US || p >= 0.005)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const us = out.champion[US] ?? 0;

  return (
    <Box label="Kampioenskans" right={<span className="meta">nog {out.remaining} duels</span>}>
      <div className="cc-main">
        <span className="cc-pct num">{pct(us)}%</span>
        <span className="meta">
          Top 3: <b>{pct(out.top3[US] ?? 0)}%</b>
          <br />
          Verwachte eindplek: <b>{(out.expectedPosition[US] ?? 0).toFixed(1).replace(".", ",")}</b>
        </span>
      </div>
      <div className="cc-list">
        {top.map(([team, p]) => (
          <div key={team} className={`cc-row ${team === US ? "us" : ""}`}>
            <span className="tname">
              <TeamLogo team={team} size={16} />
              <span>{team}</span>
            </span>
            <span className="cc-bar" aria-hidden="true">
              <span style={{ width: `${Math.max(2, p * 100)}%` }} />
            </span>
            <span className="num">{p < 0.01 ? "<1" : pct(p)}%</span>
          </div>
        ))}
      </div>
      <p className="meta" style={{ margin: "8px 0 0" }}>
        Het restant van het seizoen 5.000 keer nagespeeld met het winkansmodel. Vroeg in het seizoen is dit nog grof;
        met elke ronde wordt het nauwkeuriger.
      </p>
    </Box>
  );
}
