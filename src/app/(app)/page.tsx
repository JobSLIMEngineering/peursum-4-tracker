"use client";

import Link from "next/link";
import { useData } from "@/components/DataProvider";
import { Box, WdlBar } from "@/components/ui";
import { predict, verdict } from "@/lib/domain/model";
import { leaders, perMatchStats, playerTotals } from "@/lib/domain/stats";
import { opponent, playerLabel, US } from "@/lib/domain/types";
import { fmtDate, shortDate } from "@/lib/format";
import { nextMatch, standingOf, type AppView, type ViewMatch } from "@/lib/store/view";

export default function OverzichtPage() {
  const { view } = useData();
  const next = nextMatch(view);
  const opp = next ? opponent(next) : null;
  const totals = playerTotals(view.players, view.matches, Object.values(view.entries));
  const per = perMatchStats(view.standings);

  return (
    <div className="grid2">
      <div className="stack ovl">
        {next && opp ? <NextBlock view={view} next={next} opp={opp} /> : <Box label="Volgende wedstrijd">Geen komende competitiewedstrijd bekend.</Box>}

        <section className="box tops">
          {(["goals", "assists"] as const).map((k) => {
            const l = leaders(view.players, totals, k);
            return (
              <div className="top" key={k}>
                <div className="k">{k === "goals" ? "Topscorer" : "Topassist"}</div>
                <div className="who">{l.value ? l.players.map(playerLabel).join(", ") : "Nog niets ingevoerd"}</div>
                {l.value > 0 && <div className="num">{l.value}</div>}
              </div>
            );
          })}
        </section>

        {per && (
          <Box
            label="Per wedstrijd"
            right={
              <span className="meta">
                {per.row.won}W {per.row.drawn}G {per.row.lost}V · {per.row.played} gespeeld
              </span>
            }
            bodyClass={null}
          >
            <div className="tstats">
              {per.items.map((i) => (
                <div className="ts" key={i.label}>
                  <div className="k">{i.label}</div>
                  <div className="num">{i.value.toFixed(2)}</div>
                  <div className="meta">
                    {i.rank}e van {per.teams}
                  </div>
                </div>
              ))}
            </div>
          </Box>
        )}
      </div>

      <Box label="Stand" right={<span className="meta">{shortDate(view.standingsDate)}</span>} bodyClass="tbl-wrap">
        <table className="stand">
          <thead>
            <tr>
              <th className="t" colSpan={2}>
                Team
              </th>
              <th>G</th>
              <th>DS</th>
              <th>P</th>
            </tr>
          </thead>
          <tbody>
            {view.standings.map((r) => {
              const gd = r.goalsFor - r.goalsAgainst;
              return (
                <tr key={r.team} className={r.team === US ? "us" : r.team === opp ? "nx" : ""}>
                  <td className="pos">{r.position}</td>
                  <td className="t">{r.team}</td>
                  <td>{r.played}</td>
                  <td>{gd > 0 ? `+${gd}` : gd}</td>
                  <td className="pts">{r.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Box>
    </div>
  );
}

function NextBlock({ view, next, opp }: { view: AppView; next: ViewMatch; opp: string }) {
  const p = predict(view.model, US, opp, next.home === US);
  const d = fmtDate(next.date);
  return (
    <section className="hot">
      <div className="k">
        Volgende · {d.full} · {next.time ?? ""}
      </div>
      <div className="opp">{opp}</div>
      <div className="sub">
        {next.home === US ? "Thuis" : "Uit"} · {standingOf(view, opp)?.position}e in de stand · {verdict(p)}
      </div>
      <WdlBar p={p} />
      <div className="row-b">
        <span className="sub">
          Verwacht {p.xgUs.toFixed(1)} – {p.xgThem.toFixed(1)}
        </span>
        <Link className="link" href="/match-center/">
          Match center →
        </Link>
      </div>
    </section>
  );
}
