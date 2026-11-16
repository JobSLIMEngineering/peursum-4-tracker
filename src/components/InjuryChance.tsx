"use client";

import { attendanceRates, injuryEffect } from "@/lib/domain/insights";
import { predict } from "@/lib/domain/model";
import { opponent, playerLabel, US, type Match } from "@/lib/domain/types";
import { pct } from "@/lib/format";
import { useData } from "./DataProvider";
import { InfoTip } from "./InfoTip";
import { Box, WdlBar } from "./ui";

/** Verschil in hele procenten, zoals de kop het toont */
const points = (a: number, b: number) => Math.round(a * 100) - Math.round(b * 100);

/**
 * Wat kosten de blessures? Winkans zonder de geblesseerden tegenover de gewone voorspelling, en per
 * speler hoeveel hij scheelt. Alleen zichtbaar als er blessures bekend zijn (dus niet voor gasten).
 */
export function InjuryChance({ match }: { match: Match }) {
  const { view } = useData();
  const injured = [...view.injuredLast];
  if (!injured.length) return null;

  const base = predict(view.model, US, opponent(match), match.home === US);
  const rates = attendanceRates(view.rows, injured);
  const fx = injuryEffect(base, injured, view.impacts, rates);
  const diff = points(fx.now.win, base.win);
  const name = (id: string) => playerLabel(view.players.find((p) => p.id === id));

  return (
    <Box
      label="Blessures"
      style={{ marginBottom: 16 }}
      right={
        <InfoTip label="Hoe werkt dit?">
          De gewone voorspelling gaat uit van een normale bezetting. Een geblesseerde speler doet nu niet mee. Maakt hij het
          team meestal beter, dan kost dat winkans, en meer naarmate hij normaal vaker meedoet. Spelers met nog te weinig
          wedstrijden tellen niet mee.
        </InfoTip>
      }
    >
      <div className="lineup-head">
        <span className="num lineup-pct">{pct(fx.now.win)}%</span>
        <span>
          <b>
            winkans zonder {injured.length === 1 ? "de geblesseerde" : `de ${injured.length} geblesseerden`}
          </b>
          <span className={`meta lineup-diff ${diff > 0 ? "up" : diff < 0 ? "down" : ""}`}>
            {diff === 0 ? `gelijk aan normaal (${pct(base.win)}%)` : `${diff > 0 ? "▲" : "▼"} ${Math.abs(diff)}% t.o.v. normaal (${pct(base.win)}%)`}
          </span>
        </span>
      </div>
      <WdlBar p={fx.now} />
      <ul className="injury-list">
        {fx.players.map((p) => {
          const d = Math.round(p.win * 100);
          return (
            <li key={p.id}>
              <span>🩹 {name(p.id)}</span>
              <span className={`meta ${d > 0 ? "down" : ""}`}>{d > 0 ? `kost ${d}% winkans` : "nauwelijks verschil"}</span>
            </li>
          );
        })}
      </ul>
    </Box>
  );
}
