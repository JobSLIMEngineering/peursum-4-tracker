"use client";

import { playerSeason } from "@/lib/domain/season-stats";
import { playerLabel } from "@/lib/domain/types";
import { MON_FULL } from "@/lib/format";
import type { PlayerCard } from "@/lib/domain/playercard";
import { useData } from "./DataProvider";

const comma = (x: number, d = 1) => x.toFixed(d).replace(".", ",");

/** Maand na yyyy-mm */
const nextMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};

/**
 * Compacte lijst met de seizoensstatistieken van één speler, onder zijn kaart.
 * Met `upTo` (yyyy-mm): de stand aan het eind van die maand (bij het terugvegen door de kaarten).
 */
export function PlayerSeasonStats({ playerId, upTo, card: cardAt }: { playerId: string; upTo?: string; card?: PlayerCard }) {
  const { view } = useData();
  const inRange = (date: string | null | undefined) => !upTo || (date ?? "").slice(0, 7) <= upTo;
  const games = upTo ? view.rows.filter((r) => inRange(r.match.date)) : view.rows;
  const matches = upTo ? view.matches.filter((m) => inRange(m.date)) : view.matches;
  const s = playerSeason(playerId, games, view.players, matches, view.entries, upTo ? nextMonth(upTo) : view.thisMonth);
  const all = view.monthly.months;
  const shown = upTo ? all.filter((m) => m <= upTo).length : all.length;
  const months = all.slice(0, shown);
  const trend = (view.monthly.overall[playerId] ?? []).slice(0, shown);
  const partner = s.partner && view.players.find((p) => p.id === s.partner!.partnerId);

  const rows: [string, React.ReactNode][] = [
    ["Wedstrijden", `${s.games} van ${s.available} fit${s.available ? ` · ${Math.round((s.games / s.available) * 100)}%` : ""}`],
    ["Goals · assists", `${s.goals} · ${s.assists}${s.games ? ` (${comma((s.goals + s.assists) / s.games)} per duel)` : ""}`],
    ["Met hem erbij", `${s.record.w}W ${s.record.d}G ${s.record.l}V`],
  ];
  const card = cardAt ?? view.cards[playerId];
  if (card?.penalty)
    rows.push(["Afwezig", <span key="a" className="down">{card.absentRun} wedstrijden op rij (kaart −{card.penalty})</span>]);
  if (s.hattricks) rows.push(["Hattricks", `⚽⚽⚽ ${s.hattricks}×`]);
  if (s.points > 0) rows.push(["Spelerspunten", `${comma(s.points)} · ${comma(s.perGame)} per duel`]);
  if (s.motm || s.potm)
    rows.push(["Uitgeroepen", [s.motm && `${s.motm}× man van de wedstrijd`, s.potm && `${s.potm}× speler van de maand`].filter(Boolean).join(" · ")]);
  if (s.keeper) {
    const diff = s.keeper.expected - s.keeper.against;
    rows.push(["Als keeper", `${s.keeper.games} duels · ${s.keeper.cleanSheets}× de nul · ${comma(s.keeper.against / s.keeper.games)} tegen per duel`]);
    rows.push([
      "Tegen t.o.v. verwacht",
      <span key="d" className={diff >= 0 ? "up" : "down"}>
        {s.keeper.against} tegen, {comma(s.keeper.expected)} verwacht ({diff >= 0 ? `${comma(diff)} minder` : `${comma(-diff)} meer`})
      </span>,
    ]);
  }
  if (partner && s.partner) rows.push(["Beste maatje", `${playerLabel(partner)} (${s.partner.goals}×)`]);
  if (s.milestones.length) rows.push(["Mijlpalen", s.milestones.join(" · ")]);

  return (
    <div className="pss">
      {trend.some((x) => x != null) && months.length > 1 && (
        <div className="pss-trend" aria-label="Kaartcijfer per maand">
          {months.map((m, i) =>
            trend[i] == null ? null : (
              <span key={m} className={i > 0 && trend[i - 1] != null && trend[i]! > trend[i - 1]! ? "up" : ""}>
                <b>{trend[i]}</b>
                <small>{MON_FULL[Number(m.slice(5, 7)) - 1].slice(0, 3)}</small>
              </span>
            ),
          )}
        </div>
      )}
      <dl>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
