"use client";

import { useEffect, useState } from "react";
import { predict, verdict, type Verdict } from "@/lib/domain/model";
import { InfoTip } from "./InfoTip";
import { ScoreBoard } from "./ScoreBoard";
import { TeamLogo } from "./TeamLogo";
import { lastMatches } from "@/lib/domain/stats";
import { isPlayed, opponent, ourScore, outcome, US, type Match } from "@/lib/domain/types";
import { countdown, fmtDate, kickoff, pct } from "@/lib/format";
import { standingOf, type AppView, type ViewMatch } from "@/lib/store/view";
import { useData } from "./DataProvider";
import { SharePost } from "./SharePost";
import { Box, OUTCOME_NL, Score } from "./ui";

const VERDICT_CLASS: Record<Verdict, string> = { Favoriet: "W", Pittig: "D", Lastig: "L" };

function rankClass(pos: number | undefined) {
  if (!pos) return "low";
  return pos <= 4 ? "top" : pos <= 8 ? "mid" : "low";
}

/** Voorspelling, uitslagmatrix, laatste 3 van beide teams en uitleg van het model (PLAN.md §3.4) */
export function PredictionBlocks({ view, match }: { view: AppView; match: Match }) {
  const opp = opponent(match);
  const p = predict(view.model, US, opp, match.home === US);
  const o = standingOf(view, opp);
  const v = verdict(p);
  const cols = [0, 1, 2, 3, 4, 5];
  const max = Math.max(...p.matrix.flat());
  const ours = lastMatches(view.matches, US);
  const theirs = lastMatches(view.matches, opp);

  return (
    <>
      <div className="grid2">
        <Box
          label="Voorspelling"
          right={
            <span className="box-right">
              <span className={`tag ${VERDICT_CLASS[v]}`}>{v}</span>
              <InfoTip label="Hoe werkt de voorspelling?">
                Het model schat per team aanvals- en verdedigingssterkte uit goals voor en tegen, gecorrigeerd voor hoe
                sterk de tegenstanders waren. Elke nieuwe speelronde maakt dit scherper. Thuisvoordeel: +10%.
              </InfoTip>
            </span>
          }
        >
          <div className="probs">
            <div className="prob us">
              <div className="num">{pct(p.win)}%</div>
              <div className="k">Peursum wint</div>
            </div>
            <div className="prob">
              <div className="num">{pct(p.draw)}%</div>
              <div className="k">Gelijk</div>
            </div>
            <div className="prob">
              <div className="num">{pct(p.loss)}%</div>
              <div className="k">Verlies</div>
            </div>
          </div>
          {/* Zelfde volgorde als de kop: thuisploeg links */}
          <div className="xg">
            {[match.home, match.away].map((team, i) => (
              <div key={team} className={`side ${i ? "r" : ""}`} style={{ order: i * 2 }}>
                <span className="tname">
                  {i === 0 && <TeamLogo team={team} size={18} />}
                  <span>{team}</span>
                  {i === 1 && <TeamLogo team={team} size={18} />}
                </span>
                <div className="num" style={team === US ? { color: "var(--red-text)" } : undefined}>
                  {(team === US ? p.xgUs : p.xgThem).toFixed(2).replace(".", ",")}
                </div>
              </div>
            ))}
            <div className="mid" style={{ order: 1 }}>
              Verwachte
              <br />
              goals
            </div>
          </div>
          <div className="verdict">
            Meest waarschijnlijke uitslag{" "}
            <b>
              {match.home === US ? `${p.best.us}–${p.best.them}` : `${p.best.them}–${p.best.us}`}
            </b>{" "}
            ({pct(p.best.p)}%).{" "}
            {o && (
              <>
                {opp} staat {o.position}e met {o.points} punten uit {o.played} duels.
              </>
            )}
          </div>
        </Box>

        <Box
          label="Uitslagmatrix"
          right={<InfoTip>Kans per uitslag in %. Rood = winst, geel = gelijk, grijs = verlies.</InfoTip>}
        >
          <div className="axis">
            <span>↓ Peursum 4</span>
            <span>{opp} →</span>
          </div>
          <div className="matrix" role="table" aria-label="Kans per uitslag in procenten">
            <div className="hd" />
            {cols.map((j) => (
              <div className="hd" key={`h${j}`}>
                {j}
              </div>
            ))}
            {cols.map((i) => [
              <div className="hd" key={`r${i}`}>
                {i}
              </div>,
              ...cols.map((j) => {
                const val = p.matrix[i][j];
                const al = (0.12 + (0.88 * val) / max).toFixed(2);
                const bg =
                  i > j ? `rgba(225,36,47,${al})` : i === j ? `rgba(240,180,41,${al})` : `rgba(157,147,150,${al})`;
                const best = p.best.us === i && p.best.them === j;
                return (
                  <div
                    key={`${i}-${j}`}
                    className={`c ${best ? "best" : ""}`}
                    style={{ background: bg }}
                    title={`${i}–${j}: ${(val * 100).toFixed(1)}%`}
                  >
                    {(val * 100).toFixed(val >= 0.1 ? 0 : 1)}
                  </div>
                );
              }),
            ])}
          </div>
        </Box>

        <Box
          label="Laatste 3 · Peursum 4"
          right={
            <span className="box-right">
              <span className="meta">{ours.map((x) => OUTCOME_NL[outcome(x.goalsFor, x.goalsAgainst)]).join(" ")}</span>
              <InfoTip>Het getal links is de huidige positie van de tegenstander.</InfoTip>
            </span>
          }
        >
          {ours.map((x) => {
            const pos = standingOf(view, x.opponent)?.position;
            return (
              <div className="sos-row" key={x.match.id}>
                <span className={`rk ${rankClass(pos)}`}>{pos ?? "?"}</span>
                <span className="tname">
                  <TeamLogo team={x.opponent} size={16} />
                  <span>
                    {x.home ? "" : "@ "}
                    {x.opponent}
                  </span>
                </span>
                <Score home={x.goalsFor} away={x.goalsAgainst} ours={[x.goalsFor, x.goalsAgainst]} size={15} />
              </div>
            );
          })}
        </Box>

        <Box
          label={`Laatste 3 · ${opp}`}
          right={o && <span className="meta">{`${o.position}e · ${o.points} pt`}</span>}
        >
          {theirs.length ? (
            theirs.map((x) => {
              const pos = standingOf(view, x.opponent)?.position;
              return (
                <div className="sos-row" key={x.match.id}>
                  <span className={`rk ${rankClass(pos)}`}>{pos ?? "?"}</span>
                  <span className="tname">
                    <TeamLogo team={x.opponent} size={16} />
                    <span>
                      {x.home ? "" : "@ "}
                      {x.opponent}
                    </span>
                  </span>
                  <Score home={x.goalsFor} away={x.goalsAgainst} ours={[x.goalsFor, x.goalsAgainst]} size={15} />
                </div>
              );
            })
          ) : (
            <p className="meta" style={{ margin: 0 }}>
              Nog geen wedstrijden van {opp} bekend.
            </p>
          )}
          {o && o.played > 0 && (
            <p className="meta" style={{ margin: "8px 0 0" }}>
              Seizoen: {o.won}W {o.drawn}G {o.lost}V · {(o.goalsFor / o.played).toFixed(1)} voor /{" "}
              {(o.goalsAgainst / o.played).toFixed(1)} tegen per wedstrijd
            </p>
          )}
        </Box>
      </div>
    </>
  );
}

/**
 * Kop van een wedstrijd. Gespeeld: het UITSLAG-bord. Nog te spelen: een rustige kaart met beide
 * wapens (thuisploeg links), aftrap en aftelling. De post met vonken komt via de deelknop.
 */
export function MatchHero({ match }: { match: ViewMatch }) {
  const { view } = useData();
  const [now, setNow] = useState(() => new Date());
  const played = isPlayed(match);
  const d = fmtDate(match.date);
  const ours = ourScore(match);
  const kind = match.kind[0].toUpperCase() + match.kind.slice(1);
  const where = match.venue ?? (match.home === US ? "Thuis" : "Uit");

  useEffect(() => {
    if (played) return;
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, [played]);

  if (played) {
    return (
      <>
        <ScoreBoard match={match} />
        <div className="hero-meta">
          <span>
            {d.full}
            {ours ? ` · ${OUTCOME_LABEL[outcome(ours[0], ours[1])]}` : ""}
          </span>
          <SharePost view={view} match={match} />
        </div>
      </>
    );
  }

  const left = match.date ? countdown(kickoff(match.date, match.time), now) : null;
  return (
    <section className="box fixture">
      <div className="fixture-top">
        <span className="k">
          {kind} · {where}
        </span>
        <SharePost view={view} match={match} />
      </div>
      <div className="fixture-row">
        {[match.home, match.away].map((team, i) => (
          <div key={team} className={`fixture-team ${team === US ? "us" : ""}`} style={{ order: i * 2 }}>
            <TeamLogo team={team} size={64} />
            <span>{team}</span>
          </div>
        ))}
        <div className="fixture-mid" style={{ order: 1 }}>
          <span className="num">{match.time ?? "–"}</span>
          <span className="k">{match.date ? d.full : "Datum onbekend"}</span>
          {left && <span className="fixture-left">{left}</span>}
        </div>
      </div>
    </section>
  );
}

const OUTCOME_LABEL = { W: "Gewonnen", D: "Gelijk", L: "Verloren" } as const;
