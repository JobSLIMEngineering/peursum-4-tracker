"use client";

import { useEffect, useState } from "react";
import { predict } from "@/lib/domain/model";
import { spotlights } from "@/lib/domain/spotlight";
import { opponent, playerLabel, US, type Match } from "@/lib/domain/types";
import { pct } from "@/lib/format";
import { canvasLogoSrc } from "@/lib/logos";
import { Badges } from "./Badges";
import { useData } from "./DataProvider";
import { InfoTip } from "./InfoTip";
import { Shirt } from "./Shirt";

/**
 * Hoofdkleur uit het clublogo van de tegenstander (meest voorkomende verzadigde kleur),
 * zodat de kaartjes elke week in zijn kleuren staan. Alleen logo's van ons eigen domein mogen
 * in een canvas; anders blijft het Peursum-rood.
 */
function useTeamColor(team: string): string | null {
  const { view } = useData();
  const src = canvasLogoSrc(team, view.logos);
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;
    let alive = true;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 32;
      const g = c.getContext("2d", { willReadFrequently: true });
      if (!g) return;
      g.drawImage(img, 0, 0, 32, 32);
      const data = g.getImageData(0, 0, 32, 32).data;
      const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
      for (let i = 0; i < data.length; i += 4) {
        const [r, gg, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
        const max = Math.max(r, gg, b);
        const min = Math.min(r, gg, b);
        // Doorzichtig, (bijna) wit, zwart of grijs telt niet
        if (a < 200 || max < 50 || max - min < 60) continue;
        const key = `${r >> 5}-${gg >> 5}-${b >> 5}`;
        const x = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
        buckets.set(key, { n: x.n + 1, r: x.r + r, g: x.g + gg, b: x.b + b });
      }
      const top = [...buckets.values()].sort((a, b) => b.n - a.n)[0];
      if (alive && top && top.n > 12) setColor(`rgb(${Math.round(top.r / top.n)} ${Math.round(top.g / top.n)} ${Math.round(top.b / top.n)})`);
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src]);

  return src ? color : null;
}

/** "Let op deze speler": alleen voor de eigenaar, alleen voor deze wedstrijd */
export function Spotlights({ match }: { match: Match }) {
  const { view, readOnly } = useData();
  const opp = opponent(match);
  const color = useTeamColor(opp);
  if (readOnly) return null;

  const p = predict(view.model, US, opp, match.home === US);
  const cards = spotlights({
    players: view.players,
    rows: view.rows,
    prediction: p,
    opponent: opp,
    standings: view.standings,
    seed: match.id,
  });
  if (!cards.length) return null;

  return (
    <section style={{ marginBottom: 16 }}>
      <div className="sec-h" style={{ marginTop: 0 }}>
        <p className="lbl">Let op tegen {opp}</p>
        <InfoTip label="Hoe komen deze kaartjes tot stand?">
          Uit de vorm van de laatste 3 duels, het hele seizoen en hoe {opp} ervoor staat. De kansen komen uit de
          voorspelling voor deze wedstrijd. Wie de laatste keer geblesseerd was, staat er niet tussen. Alleen zichtbaar
          als je bent ingelogd.
        </InfoTip>
      </div>
      <div className="spots" data-noswipe>
        {cards.map((c) => {
          const pl = view.players.find((x) => x.id === c.playerId);
          if (!pl) return null;
          return (
            <article key={c.kind} className="spot" style={color ? ({ "--opp": color } as React.CSSProperties) : undefined}>
              <div className="spot-top">
                <Shirt player={pl} size={60} />
                <div>
                  <span className="cap">{c.tag}</span>
                  <b>
                    {playerLabel(pl)} <Badges playerId={pl.id} />
                  </b>
                </div>
              </div>
              <div className="spot-chance">
                <span className="num">{pct(c.chance)}%</span>
                <span>{c.chanceLabel}</span>
              </div>
              <p>{c.text}</p>
              <div className="spot-facts">
                {c.facts.map((f) => (
                  <div key={f.label}>
                    <span className="num">{f.value}</span>
                    <span className="k">{f.label}</span>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
