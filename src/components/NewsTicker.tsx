"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
  // Vorige positie en richting, zodat het oude bericht de goede kant op wegschuift
  const [from, setFrom] = useState<{ i: number; dir: 1 | -1 }>({ i: -1, dir: 1 });
  const [paused, setPaused] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const go = (to: number, dir: 1 | -1) => {
    setFrom({ i, dir });
    setI(((to % items.length) + items.length) % items.length);
  };

  useEffect(() => {
    if (paused || items.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Telkens opnieuw tellen, ook na een tik op een bolletje
    const t = setTimeout(() => {
      setFrom({ i, dir: 1 });
      setI((x) => (x + 1) % items.length);
    }, EVERY);
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
      </div>
      {/* Vegen naar links/rechts = volgend/vorig bericht */}
      <div
        className={`news-stage ${from.dir === -1 ? "back" : ""}`}
        aria-live="polite"
        onTouchStart={(e) => {
          swiped.current = false;
          touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          const t0 = touch.current;
          touch.current = null;
          if (!t0 || items.length < 2) return;
          const dx = e.changedTouches[0].clientX - t0.x;
          const dy = e.changedTouches[0].clientY - t0.y;
          if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
          swiped.current = true;
          go(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
        }}
        // Na een veeg niet ook nog de link openen
        onClickCapture={(e) => {
          if (swiped.current) {
            e.preventDefault();
            swiped.current = false;
          }
        }}
      >
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
          const cls = `news-item ${j === cur ? "on" : j === from.i ? "gone" : ""}`;
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
      {items.length > 1 && (
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
                if (j !== cur) go(j, j > cur ? 1 : -1);
              }}
            />
          ))}
        </span>
      )}
      {!paused && items.length > 1 && <span key={cur} className="news-progress" style={{ animationDuration: `${EVERY}ms` }} aria-hidden="true" />}
    </section>
  );
}
