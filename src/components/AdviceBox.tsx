"use client";

import { useMemo, useState } from "react";
import { buildAdvice, type AdviceKind } from "@/lib/domain/advice";
import { playerLabel, type Match } from "@/lib/domain/types";
import { useData } from "./DataProvider";
import { InfoTip } from "./InfoTip";
import { Box } from "./ui";

const TABS: { kind: AdviceKind; label: string }[] = [
  { kind: "selectie", label: "Selectie" },
  { kind: "tactiek", label: "Tactiek" },
];

/**
 * Adviezen op basis van de cijfers. Op Statistieken over de selectie en de speelwijze; in het
 * matchcenter (met `match`) over de volgende tegenstander.
 */
export function AdviceBox({ match }: { match?: Match }) {
  const { view } = useData();
  const all = useMemo(
    () =>
      buildAdvice({
        rows: view.rows,
        players: view.players,
        overall: Object.fromEntries(Object.entries(view.cards).map(([id, c]) => [id, c.overall])),
        impacts: view.impacts,
        model: view.model,
        matches: view.matches,
        pool: view.pool,
        injured: view.injuredLast,
        next: match ?? null,
        standings: view.standings,
        label: (id) => playerLabel(view.players.find((p) => p.id === id)),
      }),
    [view, match],
  );
  const [tab, setTab] = useState<AdviceKind>("selectie");
  const kind: AdviceKind = match ? "wedstrijd" : tab;
  const list = all.filter((a) => a.kind === kind);
  if (match && !list.length) return null;

  return (
    <Box
      label={match ? "Tips voor deze wedstrijd" : "Adviezen"}
      style={match ? { marginBottom: 16 } : { marginTop: 16 }}
      right={
        <InfoTip label="Waar komt dit vandaan?">
          Automatisch uit de cijfers: wie er meestal is, de kaartcijfers per linie, goals tegenover verwachting, en hoe sterk
          de tegenstanders aanvallen en verdedigen. Zie het als een assistent-trainer die alleen naar de cijfers kijkt: de
          trainer weet meer.
        </InfoTip>
      }
    >
      {!match && (
        <div className="chart-pick" role="tablist" aria-label="Soort advies">
          {TABS.map((t) => (
            <button key={t.kind} type="button" role="tab" aria-selected={tab === t.kind} onClick={() => setTab(t.kind)}>
              {t.label} ({all.filter((a) => a.kind === t.kind).length})
            </button>
          ))}
        </div>
      )}
      {list.length ? (
        <ul className="advice">
          {list.map((a) => (
            <li key={a.key} className={a.tone === "goed" ? "good" : "warn"}>
              <span className="advice-ic" aria-hidden="true">
                {a.tone === "goed" ? "👍" : "💡"}
              </span>
              <span>
                <b>{a.title}</b>
                <span className="meta">{a.text}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="meta" style={{ margin: 0 }}>
          Hier valt nu niets op. Na een paar ingevoerde wedstrijden meer komen hier vanzelf adviezen.
        </p>
      )}
    </Box>
  );
}
