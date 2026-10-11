"use client";

import { predict, verdict, type Verdict } from "@/lib/domain/model";
import { TeamLogo } from "./TeamLogo";
import { lastMatches } from "@/lib/domain/stats";
import { opponent, outcome, US, type Match } from "@/lib/domain/types";
import { pct } from "@/lib/format";
import { standingOf, type AppView } from "@/lib/store/view";
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
        <Box label="Voorspelling" right={<span className={`tag ${VERDICT_CLASS[v]}`}>{v}</span>}>
          <div className="probs">
            <div className="prob us">
              <div className="num">{pct(p.win)}%</div>
              <div className="k">Winst</div>
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
          <div className="xg">
            <div className="side">
              Peursum 4
              <div className="num" style={{ color: "var(--red)" }}>
                {p.xgUs.toFixed(2)}
              </div>
            </div>
            <div className="mid">
              Verwachte
              <br />
              goals
            </div>
            <div className="side r">
              {opp}
              <div className="num">{p.xgThem.toFixed(2)}</div>
            </div>
          </div>
          <div className="verdict">
            Meest waarschijnlijke uitslag{" "}
            <b>
              {p.best.us}–{p.best.them}
            </b>{" "}
            ({pct(p.best.p)}%).{" "}
            {o && (
              <>
                {opp} staat {o.position}e met {o.points} punten uit {o.played} duels.
              </>
            )}
          </div>
        </Box>

        <Box label="Uitslagmatrix" right={<span className="meta">kans per uitslag</span>}>
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
          <p className="meta" style={{ margin: "8px 0 0" }}>
            Rood = winst, geel = gelijk, grijs = verlies. Getallen in %.
          </p>
        </Box>

        <Box
          label="Laatste 3 · Peursum 4"
          right={<span className="meta">{ours.map((x) => OUTCOME_NL[outcome(x.goalsFor, x.goalsAgainst)]).join(" ")}</span>}
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
          <p className="meta" style={{ margin: "8px 0 0" }}>
            Het getal links is de huidige positie van de tegenstander.
          </p>
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
      <section className="box" style={{ marginTop: 14 }}>
        <div className="box-b meta">
          Het model schat per team aanvals- en verdedigingssterkte uit goals voor en tegen. Daarbij telt mee hoe sterk
          de tegenstanders waren: 6 goals tegen de nummer 10 tellen minder dan 6 tegen de nummer 3. Elke nieuwe
          speelronde maakt dit scherper. Thuisvoordeel: +10%.
        </div>
      </section>
    </>
  );
}

/** Rode hero: Peursum 4 vs tegenstander (of de uitslag) met datum en sportpark */
export function MatchHero({ match }: { match: Match }) {
  const played = match.homeGoals !== null && match.awayGoals !== null;
  const d = match.date ? new Date(`${match.date}T12:00`) : null;
  const DAY = ["zo", "ma", "di", "wo", "do", "vr", "za"];
  const MON = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  const date = d ? `${DAY[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}` : "Datum onbekend";
  const ours = match.home === US ? [match.homeGoals, match.awayGoals] : [match.awayGoals, match.homeGoals];
  const kind = match.kind[0].toUpperCase() + match.kind.slice(1);

  return (
    <>
      <div className="hero">
        <div className="tm">
          <TeamLogo team={match.home} size={40} />
          <div>{match.home}</div>
        </div>
        <div>
          {played ? (
            <span className="big">
              {match.homeGoals}–{match.awayGoals}
            </span>
          ) : (
            <span className="vs">vs</span>
          )}
        </div>
        <div className="tm r">
          <TeamLogo team={match.away} size={40} />
          <div>{match.away}</div>
        </div>
      </div>
      <div className="hero-meta">
        <span>
          {date}
          {match.time ? ` · ${match.time}` : ""}
          {played && ours[0] !== null && ours[1] !== null ? ` · ${OUTCOME_LABEL[outcome(ours[0], ours[1])]}` : ""}
        </span>
        <span>
          {match.venue ?? (match.home === US ? "Thuis" : "Uit")} · {kind}
        </span>
      </div>
    </>
  );
}

const OUTCOME_LABEL = { W: "Gewonnen", D: "Gelijk", L: "Verloren" } as const;
