"use client";

import Link from "next/link";
import { ChampionChance } from "@/components/ChampionChance";
import { Fireworks } from "@/components/Fireworks";
import { Medal } from "@/components/Badges";
import { Shirt } from "@/components/Shirt";
import { ScoreBoard } from "@/components/ScoreBoard";
import { TeamLogo } from "@/components/TeamLogo";
import { useData } from "@/components/DataProvider";
import { Box } from "@/components/ui";
import { lastMatches, perMatchStats } from "@/lib/domain/stats";
import { opponent, outcome, playerLabel, US } from "@/lib/domain/types";
import { fmtDate, shortDate } from "@/lib/format";
import { nextMatch, type AppView } from "@/lib/store/view";

export default function OverzichtPage() {
  const { view } = useData();
  const next = nextMatch(view);
  const opp = next ? opponent(next) : null;
  const per = perMatchStats(view.standings);

  return (
    <div className="grid2">
      <div className="stack ovl">
        <LastMatch view={view} />

        <PrizeRace view={view} />

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

/** Koplopers van de prijzen, compact; tik = Prijzen */
function PrizeRace({ view }: { view: AppView }) {
  const races = view.awards.filter((a) => a.leaders.length).slice(0, 4);
  if (!races.length) return null;
  return (
    <Box
      label="Prijzenrace"
      right={
        <Link className="link" href="/prijzen/">
          Alle prijzen
        </Link>
      }
      bodyClass={null}
    >
      <div className="race" style={{ paddingBottom: 6 }}>
        {races.map((a) => {
          const ps = a.leaders.map((id) => view.players.find((x) => x.id === id)).filter((p) => !!p);
          const r = a.rows.find((x) => x.playerId === a.leaders[0])!;
          if (!ps.length) return null;
          return (
            <Link key={a.key} href="/prijzen/" className="race-row">
              <Medal kind={a.key} size={28} />
              <span className="who">
                <span className="race-shirts">
                  {ps.slice(0, 2).map((p) => (
                    <Shirt key={p.id} player={p} size={30} />
                  ))}
                </span>
                <span>
                  <b>{ps.length > 1 ? ps.map((p) => playerLabel(p).split(" ")[0]).join(" & ") : playerLabel(ps[0])}</b>
                  <small>
                    {a.title}
                    {ps.length > 1 && " · gedeeld"}
                  </small>
                </span>
              </span>
              <span className="num">
                {r.display}
                <small>{r.unit}</small>
              </span>
            </Link>
          );
        })}
      </div>
    </Box>
  );
}
