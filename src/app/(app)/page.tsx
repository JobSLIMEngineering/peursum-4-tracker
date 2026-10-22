"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChampionChance } from "@/components/ChampionChance";
import { Fireworks } from "@/components/Fireworks";
import { NewsTicker } from "@/components/NewsTicker";
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
        <MatchPair view={view} startOnNext={soon} />
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


/**
 * Uitslag en volgende wedstrijd naast elkaar: veeg (of tik op een bolletje) om te wisselen.
 * Is de volgende wedstrijd binnen 3 dagen, dan staat die vooraan. Bij winst vuurwerk (één keer per sessie).
 */
function MatchPair({ view, startOnNext }: { view: AppView; startOnNext: boolean }) {
  const last = lastMatches(view.matches, US, 1)[0];
  const next = nextMatch(view);
  const track = useRef<HTMLDivElement>(null);
  const [cur, setCur] = useState(0);
  const slides: React.ReactNode[] = [];

  if (last)
    slides.push(
      <Link key="last" className="last-match" href={`/competitie/?w=${encodeURIComponent(last.match.id)}`}>
        {outcome(last.goalsFor, last.goalsAgainst) === "W" && <Fireworks id={`home-${last.match.id}`} />}
        <ScoreBoard match={last.match} size="compact">
          <div className="board-meta">{fmtDate(last.match.date).full}</div>
        </ScoreBoard>
      </Link>,
    );
  if (next?.date)
    slides.push(
      <Link key="next" className="last-match" href="/match-center/">
        <ScoreBoard match={next} size="compact" title="Volgende">
          <div className="board-meta">
            {fmtDate(next.date).full}
            {next.time ? ` · ${next.time}` : ""}
            {next.home === US ? " · thuis" : " · uit"}
          </div>
        </ScoreBoard>
      </Link>,
    );
  if (startOnNext && slides.length === 2) slides.reverse();

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setCur(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (!slides.length) return null;
  return (
    <div className="pair">
      <div className="pair-track" ref={track}>
        {slides.map((x, i) => (
          <div key={i} className="pair-slide">
            {x}
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="news-dots pair-dots" role="tablist" aria-label="Uitslag of volgende wedstrijd">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === cur}
              aria-label={i === (startOnNext ? 1 : 0) ? "Laatste uitslag" : "Volgende wedstrijd"}
              onClick={() => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: "smooth" })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
