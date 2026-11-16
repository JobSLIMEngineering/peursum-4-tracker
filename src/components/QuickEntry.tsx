"use client";

import Link from "next/link";
import { isOurs, isPlayed, opponent, ourScore, US, type MatchEntry } from "@/lib/domain/types";
import { fmtDate, todayNL } from "@/lib/format";
import type { AppView } from "@/lib/store/view";
import { useData } from "./DataProvider";

/** Alleen een geplande selectie (nog geen echte invoer): geen keeper, geen goals, geen stats */
export const isPlanOnly = (e: MatchEntry | undefined) => !e || (e.keeperId == null && !e.goals?.length && Object.keys(e.stats).length === 0);

/** Laatste eigen wedstrijd van de afgelopen 2 weken die nog uitslag of stats mist */
export function openEntry(view: AppView, today = todayNL()) {
  const from = new Date(`${today}T12:00:00`);
  from.setDate(from.getDate() - 14);
  const since = from.toISOString().slice(0, 10);
  return view.matches
    .filter((m) => isOurs(m) && m.kind !== "oefen" && m.date && m.date <= today && m.date >= since)
    .filter((m) => !isPlayed(m) || isPlanOnly(view.entries[m.id]))
    .sort((a, b) => b.date!.localeCompare(a.date!))[0];
}

/**
 * Snelle invoer: staat bovenaan het Overzicht zodra er een wedstrijd gespeeld is die nog niet is
 * ingevuld. Eén tik naar de uitslag, en daarna meteen door naar wie er was en wie scoorde.
 */
export function QuickEntry() {
  const { view, readOnly } = useData();
  if (readOnly) return null;
  const m = openEntry(view);
  if (!m) return null;
  const played = isPlayed(m);
  const score = ourScore(m);
  const href = `/competitie/?w=${encodeURIComponent(m.id)}&stap=${played ? "invoer" : "uitslag"}`;

  return (
    <Link className="box quick-entry" href={href}>
      <div className="box-b">
        <p className="k">{played ? "Nog invullen" : "Net gespeeld?"}</p>
        <p className="quick-entry-h">
          {m.home === US ? "Thuis" : "Uit"} tegen {opponent(m)}
          {score && (
            <b className={`score ${score[0] > score[1] ? "W" : score[0] === score[1] ? "D" : "L"}`}>
              {" "}
              {score[0]}–{score[1]}
            </b>
          )}
        </p>
        <p className="meta">
          {fmtDate(m.date).full} · {played ? "Wie was er, wie scoorde? Dat staat in een minuut." : "Vul de uitslag in en ga meteen door naar de stats."}
        </p>
        <span className="btn primary sm">{played ? "Stats invoeren" : "Uitslag invullen"} →</span>
      </div>
    </Link>
  );
}
