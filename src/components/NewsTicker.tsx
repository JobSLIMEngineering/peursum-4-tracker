"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildNews, type NewsKind } from "@/lib/domain/news";
import { playerLabel } from "@/lib/domain/types";
import { todayNL } from "@/lib/format";
import { useData } from "./DataProvider";
import { Shirt } from "./Shirt";

const ICON: Record<NewsKind, string> = {
  stand: "📊",
  uitschieter: "💥",
  verrassing: "😮",
  inhaal: "🔁",
  terug: "💪",
  prijs: "🏆",
  vuur: "🔥",
};

const EVERY = 4000;

/** Nieuws: berichtjes die om de beurt rustig voorbij komen (tik op een bolletje om te kiezen) */
export function NewsTicker() {
  const { view, readOnly } = useData();
  const items = useMemo(
    () =>
      buildNews({
        today: todayNL(),
        matches: view.matches,
        standings: view.standings,
        snapshots: view.snapshots,
        // Blessures zijn privé: gasten zien geen "terug van blessure"
        players: readOnly ? [] : view.players,
        entries: readOnly ? {} : view.entries,
        awards: view.awards,
        streaks: view.streaks,
        label: (id) => playerLabel(view.players.find((p) => p.id === id)),
      }),
    [view, readOnly],
  );
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || items.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Telkens opnieuw tellen, ook na een tik op een bolletje
    const t = setTimeout(() => setI((x) => (x + 1) % items.length), EVERY);
    return () => clearTimeout(t);
  }, [i, paused, items.length]);

  if (!items.length) return null;
  const cur = i % items.length;

  return (
    <section
      className="box news"
      aria-roledescription="carrousel"
      aria-label="Nieuws"
      // Alleen pauzeren met een muis erboven; op een telefoon gaat een tik nooit meer "weg"
      onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setPaused(false)}
    >
      <div className="box-h">
        <p className="lbl">Nieuws</p>
        <span className="news-dots" role="tablist">
          {items.map((n, j) => (
            <button
              key={n.key}
              type="button"
              role="tab"
              aria-selected={j === cur}
              aria-label={`${n.kicker}: ${n.title}`}
              onClick={(e) => {
                e.preventDefault();
                setI(j);
              }}
            />
          ))}
        </span>
      </div>
      <div className="news-stage" aria-live="polite">
        {items.map((n, j) => {
          const p = n.playerId ? view.players.find((x) => x.id === n.playerId) : undefined;
          const body = (
            <>
              {p ? <Shirt player={p} size={44} /> : <span className="news-ico" aria-hidden="true">{ICON[n.kind]}</span>}
              <span className="news-txt">
                <span className={`k news-k ${n.kind}`}>{n.kicker}</span>
                <b>{n.title}</b>
                {n.text && <span className="meta">{n.text}</span>}
              </span>
            </>
          );
          const cls = `news-item ${j === cur ? "on" : j === (cur - 1 + items.length) % items.length ? "gone" : ""}`;
          return n.href ? (
            <Link key={n.key} href={n.href} className={cls} aria-hidden={j !== cur} tabIndex={j === cur ? 0 : -1}>
              {body}
            </Link>
          ) : (
            <div key={n.key} className={cls} aria-hidden={j !== cur}>
              {body}
            </div>
          );
        })}
      </div>
      {!paused && items.length > 1 && <span key={cur} className="news-progress" style={{ animationDuration: `${EVERY}ms` }} aria-hidden="true" />}
    </section>
  );
}
