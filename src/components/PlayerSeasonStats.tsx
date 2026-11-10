"use client";

import { playerSeason } from "@/lib/domain/season-stats";
import { playerLabel } from "@/lib/domain/types";
import { MON_FULL } from "@/lib/format";
import { useData } from "./DataProvider";

const comma = (x: number, d = 1) => x.toFixed(d).replace(".", ",");

/** Compacte lijst met de seizoensstatistieken van één speler, onder zijn kaart */
export function PlayerSeasonStats({ playerId }: { playerId: string }) {
  const { view } = useData();
  const s = playerSeason(playerId, view.rows, view.players, view.matches, view.entries);
  const months = view.monthly.months;
  const trend = view.monthly.overall[playerId] ?? [];
  const partner = s.partner && view.players.find((p) => p.id === s.partner!.partnerId);

  const rows: [string, React.ReactNode][] = [
    ["Wedstrijden", `${s.games} van ${s.available} fit${s.available ? ` · ${Math.round((s.games / s.available) * 100)}%` : ""}`],
    ["Goals · assists", `${s.goals} · ${s.assists}${s.games ? ` (${comma((s.goals + s.assists) / s.games)} per duel)` : ""}`],
    ["Met hem erbij", `${s.record.w}W ${s.record.d}G ${s.record.l}V`],
  ];
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
