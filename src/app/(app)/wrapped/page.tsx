"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { Medal } from "@/components/Badges";
import { Shirt } from "@/components/Shirt";
import { TeamLogo } from "@/components/TeamLogo";
import { duos, seasonForm } from "@/lib/domain/insights";
import { lastMatches, playerTotals } from "@/lib/domain/stats";
import { playerLabel, US } from "@/lib/domain/types";
import { todayNL } from "@/lib/format";
import type { StoredPlayer } from "@/lib/store/schema";

const EVERY = 6000;
const comma = (x: number, d = 1) => x.toFixed(d).replace(".", ",");

interface Slide {
  key: string;
  kicker: string;
  title: React.ReactNode;
  big?: React.ReactNode;
  sub?: React.ReactNode;
  art?: React.ReactNode;
}

/** Naam van deze editie: winterstop (najaar), of het hele seizoen als alles gespeeld is */
function edition(today: string, done: boolean) {
  const y = Number(today.slice(0, 4));
  const season = today.slice(5) >= "07-01" ? `${y}/${String(y + 1).slice(2)}` : `${y - 1}/${String(y).slice(2)}`;
  if (done) return `Seizoen ${season}`;
  const m = today.slice(5, 7);
  return m >= "11" || m <= "02" ? `Winterstop ${season}` : `Tussenstand ${season}`;
}

/** Peursum 4 Wrapped: het seizoen tot nu toe in een paar kaarten, zoals Instagram-stories */
export default function WrappedPage() {
  const { view } = useData();
  const slides = useMemo<Slide[]>(() => {
    const us = view.standings.find((r) => r.team === US);
    const totals = playerTotals(view.players, view.matches, Object.values(view.entries));
    const players = view.players.filter((p) => p.active);
    const by = (id: string | undefined) => view.players.find((p) => p.id === id);
    const top = (k: "goals" | "assists") => [...players].sort((a, b) => (totals[b.id]?.[k] ?? 0) - (totals[a.id]?.[k] ?? 0))[0];
    const scorer = top("goals");
    const assist = top("assists");
    const keeper = [...players].sort((a, b) => (totals[b.id]?.cleanSheets ?? 0) - (totals[a.id]?.cleanSheets ?? 0))[0];
    const duo = duos(view.matches, view.entries)[0];
    const form = seasonForm(view.model, view.matches, view.pool).at(-1);
    const games = lastMatches(view.matches, US, 99);
    const best = [...games].sort((a, b) => b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst))[0];
    const done = !!us && us.played >= 2 * (view.standings.length - 1);
    const shirt = (p: StoredPlayer | undefined) => (p ? <Shirt player={p} size={120} /> : null);
    const out: Slide[] = [
      {
        key: "intro",
        kicker: edition(todayNL(), done),
        title: "Peursum 4 Wrapped",
        sub: us ? `${us.played} wedstrijden, één team. Dit was het tot nu toe.` : undefined,
        art: <TeamLogo team={US} size={120} />,
      },
    ];
    if (us)
      out.push({
        key: "stand",
        kicker: "De stand",
        title: us.position === 1 ? "Bovenaan" : `Plek ${us.position}`,
        big: `${us.points} pnt`,
        sub: `${us.won}× gewonnen · ${us.drawn}× gelijk · ${us.lost}× verloren · ${us.goalsFor}–${us.goalsAgainst} in doelpunten`,
      });
    if (form)
      out.push({
        key: "vorm",
        kicker: "Boven verwachting",
        title: form.cumPoints >= form.cumExpected ? "Beter dan het model dacht" : "Er zat meer in",
        big: `${form.cumPoints >= form.cumExpected ? "+" : "−"}${comma(Math.abs(form.cumPoints - form.cumExpected))}`,
        sub: `${form.cumPoints} punten gehaald, ${comma(form.cumExpected)} verwacht tegen deze tegenstanders`,
      });
    if (scorer && totals[scorer.id]?.goals)
      out.push({ key: "goals", kicker: "Topscorer", title: playerLabel(scorer), big: `${totals[scorer.id].goals} goals`, art: shirt(scorer) });
    if (assist && totals[assist.id]?.assists)
      out.push({ key: "assist", kicker: "Assistkoning", title: playerLabel(assist), big: `${totals[assist.id].assists} assists`, art: shirt(assist) });
    if (duo)
      out.push({
        key: "duo",
        kicker: "Duo van het seizoen",
        title: `${playerLabel(by(duo.assistId))} → ${playerLabel(by(duo.scorerId))}`,
        big: `${duo.goals}× samen`,
        art: (
          <span className="wr-duo">
            {shirt(by(duo.assistId))}
            {shirt(by(duo.scorerId))}
          </span>
        ),
      });
    if (keeper && totals[keeper.id]?.cleanSheets)
      out.push({ key: "keeper", kicker: "De laatste man", title: playerLabel(keeper), big: `${totals[keeper.id].cleanSheets}× de nul`, art: shirt(keeper) });
    if (best)
      out.push({
        key: "best",
        kicker: "Grootste zege",
        title: `${best.home ? "Peursum 4" : best.opponent} – ${best.home ? best.opponent : "Peursum 4"}`,
        big: best.home ? `${best.goalsFor}–${best.goalsAgainst}` : `${best.goalsAgainst}–${best.goalsFor}`,
        art: <TeamLogo team={best.opponent} size={110} />,
      });
    const leaders = view.awards.filter((a) => a.leaders.length);
    if (leaders.length)
      out.push({
        key: "prijzen",
        kicker: "Op weg naar de bekers",
        title: "Prijzenrace",
        sub: (
          <span className="wr-list">
            {leaders.map((a) => (
              <span key={a.key}>
                <Medal kind={a.key} size={26} /> {a.title}: <b>{a.leaders.map((id) => playerLabel(by(id))).join(" & ")}</b>
              </span>
            ))}
          </span>
        ),
      });
    out.push({ key: "outro", kicker: done ? "Tot volgend seizoen" : "Op naar de tweede helft", title: "#PEURSUM4" });
    return out;
  }, [view]);

  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || i >= slides.length - 1) return;
    const t = setTimeout(() => setI((x) => x + 1), EVERY);
    return () => clearTimeout(t);
  }, [i, paused, slides.length]);

  const s = slides[i];
  return (
    <div className="wrapped">
      <div className="wr-bars" aria-hidden="true">
        {slides.map((x, j) => (
          <span key={x.key}>
            <i className={j < i ? "full" : j === i && !paused ? "run" : ""} style={j === i ? { animationDuration: `${EVERY}ms` } : undefined} />
          </span>
        ))}
      </div>
      <div
        className="wr-card"
        onPointerDown={() => setPaused(true)}
        onPointerUp={(e) => {
          setPaused(false);
          const r = e.currentTarget.getBoundingClientRect();
          // Links tikken = terug, rechts = verder
          if (e.clientX - r.left < r.width / 3) setI((x) => Math.max(0, x - 1));
          else setI((x) => Math.min(slides.length - 1, x + 1));
        }}
        onPointerLeave={() => setPaused(false)}
      >
        <div key={s.key} className="wr-in">
          <span className="wr-k">{s.kicker}</span>
          {s.art && <div className="wr-art">{s.art}</div>}
          <h2 className="wr-title">{s.title}</h2>
          {s.big && <div className="wr-big">{s.big}</div>}
          {s.sub && <div className="wr-sub">{s.sub}</div>}
        </div>
        <span className="wr-count">
          {i + 1}/{slides.length}
        </span>
      </div>
      <div className="actions" style={{ justifyContent: "center" }}>
        <button className="btn sm" type="button" onClick={() => setI(0)}>
          Opnieuw
        </button>
        <Link className="btn sm" href="/statistieken/">
          Naar statistieken
        </Link>
      </div>
    </div>
  );
}
