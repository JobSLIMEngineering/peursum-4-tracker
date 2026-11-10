"use client";

import { predict } from "@/lib/domain/model";
import { topper, type Result } from "@/lib/domain/topper";
import { US, type Match } from "@/lib/domain/types";
import { pct } from "@/lib/format";
import { useData } from "./DataProvider";
import { TeamLogo } from "./TeamLogo";

const LABEL: Record<Result, string> = { W: "Bij winst", G: "Bij gelijkspel", V: "Bij verlies" };
const gap = (n: number) => (n > 0 ? `${n} voor` : n < 0 ? `${-n} achter` : "gelijk");

/**
 * Topper: de wedstrijd tegen een directe concurrent bovenin. Wat er op het spel staat per uitkomst,
 * met de kans op die uitkomst, zodat je de spanning ziet.
 */
export function TopperBlock({ match }: { match: Match }) {
  const { view } = useData();
  const t = topper(view.standings, match);
  if (!t) return null;
  const p = predict(view.model, US, t.opponent, match.home === US);
  const chance: Record<Result, number> = { W: p.win, G: p.draw, V: p.loss };
  const top = view.standings.find((r) => r.position === 1);

  return (
    <section className="topper">
      <div className="topper-h">
        <span className="topper-tag">Topper</span>
        <span className="topper-vs">
          <span>
            <TeamLogo team={US} size={30} />
            <b>{t.us.position}e</b>
            <small>{t.us.points} pnt</small>
          </span>
          <i>vs</i>
          <span>
            <TeamLogo team={t.opponent} size={30} />
            <b>{t.them.position}e</b>
            <small>{t.them.points} pnt</small>
          </span>
        </span>
      </div>
      <p className="topper-lead">
        {t.us.points > t.them.points
          ? `${t.opponent} staat ${t.us.points - t.them.points} punt${t.us.points - t.them.points === 1 ? "" : "en"} achter ons. Winnen en de concurrent staat op afstand.`
          : t.us.points < t.them.points
            ? `We staan ${t.them.points - t.us.points} punt${t.them.points - t.us.points === 1 ? "" : "en"} achter ${t.opponent}. Dit is de kans om ze in te halen.`
            : `Gelijk in punten met ${t.opponent}. De winnaar neemt de plek.`}
      </p>
      <div className="topper-grid">
        {t.scenarios.map((s) => (
          <div key={s.result} className={`topper-s ${s.result}`}>
            <span className="k">{LABEL[s.result]}</span>
            <span className="num">{s.position}e</span>
            <span className="meta">{s.points} pnt</span>
            <span className="topper-gap">
              {gap(s.gapOpponent)} op {t.opponent.replace(/\s+\d+$/, "")}
            </span>
            {top && top.team !== US && top.team !== t.opponent && (
              <span className="topper-gap">
                {gap(s.gapTop)} op {top.team.replace(/\s+\d+$/, "")}
              </span>
            )}
            <span className="topper-p">{pct(chance[s.result])}% kans</span>
          </div>
        ))}
      </div>
    </section>
  );
}
