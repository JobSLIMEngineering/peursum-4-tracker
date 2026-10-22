"use client";

import Link from "next/link";
import { useState } from "react";
import { ChampionChance } from "@/components/ChampionChance";
import { Fireworks } from "@/components/Fireworks";
import { NewsTicker } from "@/components/NewsTicker";
import { MatchHero } from "@/components/Prediction";
import { ScoreBoard } from "@/components/ScoreBoard";
import { TeamLogo } from "@/components/TeamLogo";
import { useData } from "@/components/DataProvider";
import { Box } from "@/components/ui";
import { lastMatches, perMatchStats } from "@/lib/domain/stats";
import { opponent, outcome, US } from "@/lib/domain/types";
import { fmtDate, kickoff, shortDate } from "@/lib/format";
import { nextMatch, type AppView } from "@/lib/store/view";

export default function OverzichtPage() {
  const { view } = useData();
  const next = nextMatch(view);
  const opp = next ? opponent(next) : null;
  // De volgende wedstrijd pas op het Overzicht als hij echt dichtbij is (3 dagen of minder)
  const [now] = useState(() => Date.now());
  const soon = !!next?.date && kickoff(next.date, next.time).getTime() - now < 3 * 864e5;
  const per = perMatchStats(view.standings);

  return (
    <div className="grid2">
      <div className="stack ovl">
        {soon && next && <MatchHero match={next} />}
        <LastMatch view={view} />
        <NewsTicker />

        <ChampionChance view={view} />

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
                  <div className="num">{i.value.toFixed(2).replace(".", ",")}</div>
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
                  <td className="t">
                    <span className="tname">
                      <TeamLogo team={r.team} size={18} />
                      <span>{r.team}</span>
                    </span>
                  </td>
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


/** Laatst gespeelde competitiewedstrijd als "UITSLAG"-bord; bij winst vuurwerk (één keer per sessie) */
function LastMatch({ view }: { view: AppView }) {
  const last = lastMatches(view.matches, US, 1)[0];
  if (!last) return null;
  const r = outcome(last.goalsFor, last.goalsAgainst);
  return (
    <Link className="last-match" href={`/competitie/?w=${encodeURIComponent(last.match.id)}`}>
      {r === "W" && <Fireworks id={`home-${last.match.id}`} />}
      <ScoreBoard match={last.match} size="compact">
        <div className="board-meta">{fmtDate(last.match.date).full}</div>
      </ScoreBoard>
    </Link>
  );
}
