"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Medal } from "@/components/Badges";
import { useData } from "@/components/DataProvider";
import { Shirt, ShirtSvg } from "@/components/Shirt";
import { TeamLogo } from "@/components/TeamLogo";
import type { AwardKey } from "@/lib/domain/awards";
import { duos, seasonForm } from "@/lib/domain/insights";
import { playersOfTheMonth } from "@/lib/domain/rating";
import { lastMatches, playerTotals } from "@/lib/domain/stats";
import { playerLabel, US } from "@/lib/domain/types";
import { MON_FULL, todayNL } from "@/lib/format";
import { canvasLogoSrc } from "@/lib/logos";
import type { StoredPlayer } from "@/lib/store/schema";
import { renderWrappedVideo, videoType } from "@/lib/wrappedVideo";

const EVERY = 6000;
const comma = (x: number, d = 1) => x.toFixed(d).replace(".", ",");

interface Slide {
  key: string;
  kicker: string;
  title: string;
  big?: string;
  sub?: string;
  shirts?: StoredPlayer[];
  logo?: string;
  list?: { award: AwardKey; text: string }[];
}

/** Naam van deze editie: winterstop (najaar), of het hele seizoen als alles gespeeld is */
function edition(today: string, done: boolean) {
  const y = Number(today.slice(0, 4));
  const season = today.slice(5) >= "07-01" ? `${y}/${String(y + 1).slice(2)}` : `${y - 1}/${String(y).slice(2)}`;
  if (done) return `Seizoen ${season}`;
  const m = today.slice(5, 7);
  return m >= "11" || m <= "02" ? `Winterstop ${season}` : `Tussenstand ${season}`;
}

/** Peursum 4 Wrapped: het seizoen tot nu toe in een paar kaarten, zoals Instagram-stories, ook als video te delen */
export default function WrappedPage() {
  const { view } = useData();
  const slides = useMemo<Slide[]>(() => {
    const us = view.standings.find((r) => r.team === US);
    const totals = playerTotals(view.players, view.matches, Object.values(view.entries));
    const players = view.players.filter((p) => p.active);
    const by = (id: string | undefined) => view.players.find((p) => p.id === id);
    const top = (k: "goals" | "assists" | "cleanSheets") => [...players].sort((a, b) => (totals[b.id]?.[k] ?? 0) - (totals[a.id]?.[k] ?? 0))[0];
    const scorer = top("goals");
    const assist = top("assists");
    const keeper = top("cleanSheets");
    const duo = duos(view.matches, view.entries)[0];
    const form = seasonForm(view.model, view.matches, view.pool).at(-1);
    const games = lastMatches(view.matches, US, 99);
    const best = [...games].sort((a, b) => b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst))[0];
    const potm = playersOfTheMonth(view.rows, view.players).at(-1);
    const done = !!us && us.played >= 2 * (view.standings.length - 1);
    const out: Slide[] = [
      {
        key: "intro",
        kicker: edition(todayNL(), done),
        title: "Peursum 4 Wrapped",
        sub: us ? `${us.played} wedstrijden, één team. Dit was het tot nu toe.` : undefined,
        logo: US,
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
    if (scorer && totals[scorer.id]?.goals) out.push({ key: "goals", kicker: "Topscorer", title: playerLabel(scorer), big: `${totals[scorer.id].goals} goals`, shirts: [scorer] });
    if (assist && totals[assist.id]?.assists)
      out.push({ key: "assist", kicker: "Assistkoning", title: playerLabel(assist), big: `${totals[assist.id].assists} assists`, shirts: [assist] });
    if (duo && by(duo.assistId) && by(duo.scorerId))
      out.push({
        key: "duo",
        kicker: "Duo van het seizoen",
        title: `${playerLabel(by(duo.assistId))} → ${playerLabel(by(duo.scorerId))}`,
        big: `${duo.goals}× samen`,
        shirts: [by(duo.assistId)!, by(duo.scorerId)!],
      });
    if (keeper && totals[keeper.id]?.cleanSheets)
      out.push({ key: "keeper", kicker: "De laatste man", title: playerLabel(keeper), big: `${totals[keeper.id].cleanSheets}× de nul`, shirts: [keeper] });
    if (potm && by(potm.playerId))
      out.push({
        key: "potm",
        kicker: `Speler van ${MON_FULL[Number(potm.month.slice(5, 7)) - 1]}`,
        title: playerLabel(by(potm.playerId)),
        big: `${comma(potm.total)} pnt`,
        shirts: [by(potm.playerId)!],
      });
    if (best)
      out.push({
        key: "best",
        kicker: "Grootste zege",
        title: `${best.home ? "Peursum 4" : best.opponent} – ${best.home ? best.opponent : "Peursum 4"}`,
        big: best.home ? `${best.goalsFor}–${best.goalsAgainst}` : `${best.goalsAgainst}–${best.goalsFor}`,
        logo: best.opponent,
      });
    const leaders = view.awards.filter((a) => a.leaders.length);
    if (leaders.length)
      out.push({
        key: "prijzen",
        kicker: "Op weg naar de bekers",
        title: "Prijzenrace",
        list: leaders.map((a) => ({ award: a.key, text: `${a.title}: ${a.leaders.map((id) => playerLabel(by(id))).join(" & ")}` })),
      });
    out.push({ key: "outro", kicker: done ? "Tot volgend seizoen" : "Op naar de tweede helft", title: "#PEURSUM4" });
    return out;
  }, [view]);

  const [i, setI] = useState(0);
  // Pas na het laden weten we of de browser video kan opnemen (niet tijdens het bouwen van de site)
  const [canVideo, setCanVideo] = useState(false);
  useEffect(() => queueMicrotask(() => setCanVideo(!!videoType())), []);
  const [paused, setPaused] = useState(false);
  const [video, setVideo] = useState<{ state: "idle" } | { state: "busy"; p: number } | { state: "done"; url: string; blob: Blob; ext: string } | { state: "error"; msg: string }>({ state: "idle" });

  useEffect(() => {
    if (paused || i >= slides.length - 1 || video.state === "busy") return;
    const t = setTimeout(() => setI((x) => x + 1), EVERY);
    return () => clearTimeout(t);
  }, [i, paused, slides.length, video.state]);

  async function makeVideo() {
    setVideo({ state: "busy", p: 0 });
    try {
      const data = slides.map((s) => ({
        kicker: s.kicker,
        title: s.title,
        big: s.big,
        sub: s.sub,
        list: s.list?.map((x) => x.text),
        art: {
          svg: s.shirts?.map((p) => renderToStaticMarkup(<ShirtSvg player={p} size={380} gold={view.goldKeepers.has(p.id)} />)),
          logo: s.logo ? canvasLogoSrc(s.logo, view.logos) : null,
        },
      }));
      const { blob, ext } = await renderWrappedVideo(data, (p) => setVideo({ state: "busy", p }));
      setVideo({ state: "done", url: URL.createObjectURL(blob), blob, ext });
    } catch (e) {
      setVideo({ state: "error", msg: e instanceof Error ? e.message : "Video maken lukt niet." });
    }
  }

  async function shareVideo() {
    if (video.state !== "done") return;
    const file = new File([video.blob], `peursum4-wrapped.${video.ext}`, { type: video.blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Peursum 4 Wrapped" });
      } catch {
        // gebruiker annuleerde
      }
      return;
    }
    const a = document.createElement("a");
    a.href = video.url;
    a.download = file.name;
    a.click();
  }

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
          {s.shirts && (
            <div className="wr-art wr-duo">
              {s.shirts.map((p) => (
                <Shirt key={p.id} player={p} size={120} />
              ))}
            </div>
          )}
          {s.logo && (
            <div className="wr-art">
              <TeamLogo team={s.logo} size={110} />
            </div>
          )}
          <h2 className="wr-title">{s.title}</h2>
          {s.big && <div className="wr-big">{s.big}</div>}
          {s.sub && <div className="wr-sub">{s.sub}</div>}
          {s.list && (
            <span className="wr-sub wr-list">
              {s.list.map((x) => (
                <span key={x.award}>
                  <Medal kind={x.award} size={26} /> {x.text}
                </span>
              ))}
            </span>
          )}
        </div>
        <span className="wr-count">
          {i + 1}/{slides.length}
        </span>
      </div>

      <div className="actions" style={{ justifyContent: "center" }}>
        {video.state === "done" ? (
          <>
            <button className="btn primary" type="button" onClick={shareVideo}>
              Deel video
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                URL.revokeObjectURL(video.url);
                setVideo({ state: "idle" });
              }}
            >
              Opnieuw maken
            </button>
          </>
        ) : video.state === "busy" ? (
          <span className="wr-making">
            <span className="wr-meter">
              <i style={{ width: `${Math.round(video.p * 100)}%` }} />
            </span>
            Video maken… {Math.round(video.p * 100)}% · laat dit scherm open
          </span>
        ) : (
          canVideo && (
            <button className="btn primary" type="button" onClick={makeVideo}>
              Deel als video
            </button>
          )
        )}
        <button className="btn sm" type="button" onClick={() => setI(0)}>
          Opnieuw
        </button>
        <Link className="btn sm" href="/statistieken/">
          Statistieken
        </Link>
      </div>
      {video.state === "error" && <p className="note warn">{video.msg}</p>}
      {video.state === "done" && (
        <video className="wr-video" src={video.url} controls playsInline loop />
      )}
    </div>
  );
}
