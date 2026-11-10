"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { TeamLogo } from "@/components/TeamLogo";
import { Score } from "@/components/ui";
import { predict } from "@/lib/domain/model";
import { isOurs, isPlayed, opponent, ourScore, outcome, US } from "@/lib/domain/types";
import { MON_FULL, pct, todayNL } from "@/lib/format";
import { hasPrediction, type ViewMatch } from "@/lib/store/view";

/** Vaste trainingen: maandag en woensdag om 20:00 (niet in juli, dan is het zomerstop) */
const TRAINING = [
  { day: 1, time: "20:00" },
  { day: 3, time: "20:00" },
];
const DAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => new Date(`${s}T12:00`);
/** Maandag van de week van een datum */
const monday = (d: Date) => {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const training = (d: Date) => (d.getMonth() === 6 ? [] : TRAINING.filter((t) => t.day === d.getDay()));

/**
 * Kalender per maand: elke rij is een week (ma–zo). In elk vakje klein onze wedstrijd (wapen, thuis/uit,
 * tijd of uitslag) en de trainingen. Tik op een week: die klapt open met onze wedstrijd bovenaan,
 * daarna de trainingen en de andere wedstrijden van die week.
 */
export function Calendar() {
  const { view } = useData();
  const today = todayNL();
  const ours = useMemo(() => view.matches.filter((m) => isOurs(m) && m.date) as ViewMatch[], [view]);
  const byDate = useMemo(() => {
    const map = new Map<string, ViewMatch[]>();
    for (const m of view.matches) if (m.date) map.set(m.date, [...(map.get(m.date) ?? []), m as ViewMatch]);
    return map;
  }, [view]);
  const undated = view.matches.filter((m) => isOurs(m) && !m.date && !isPlayed(m)) as ViewMatch[];

  // Start op de maand van vandaag (of van de eerstvolgende wedstrijd als die in een latere maand valt)
  const next = ours.filter((m) => !isPlayed(m) && m.date! >= today).sort((a, b) => a.date!.localeCompare(b.date!))[0];
  const startMonth = (next && next.date! > today && next.date!.slice(0, 7) > today.slice(0, 7) ? next.date! : today).slice(0, 7);
  const [month, setMonth] = useState(startMonth);
  const [open, setOpen] = useState<string | null>(() => iso(monday(parse(next?.date ?? today))));

  const first = parse(`${month}-01`);
  const weeks: Date[][] = [];
  for (let w = monday(first); w.getMonth() === first.getMonth() || w < first; w = new Date(w.getTime() + 7 * 864e5)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => new Date(w.getTime() + i * 864e5)));
    if (weeks.length > 6) break;
  }
  const shift = (n: number) => {
    const d = new Date(first);
    d.setMonth(d.getMonth() + n);
    setMonth(iso(d).slice(0, 7));
  };

  return (
    <section className="box cal">
      <div className="cal-h">
        <button type="button" className="cal-nav" aria-label="Vorige maand" onClick={() => shift(-1)}>
          ‹
        </button>
        <b>
          {MON_FULL[first.getMonth()]} {first.getFullYear()}
        </b>
        <button type="button" className="cal-nav" aria-label="Volgende maand" onClick={() => shift(1)}>
          ›
        </button>
      </div>
      <div className="cal-days" aria-hidden="true">
        {DAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      {weeks.map((week) => {
        const key = iso(week[0]);
        const isOpen = open === key;
        const events = week.flatMap((d) => byDate.get(iso(d)) ?? []);
        const mine = events.filter(isOurs);
        const others = events.filter((m) => !isOurs(m));
        return (
          <div key={key} className={`cal-week ${isOpen ? "open" : ""}`}>
            <button type="button" className="cal-row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : key)}>
              {week.map((d) => {
                const ds = iso(d);
                const m = (byDate.get(ds) ?? []).find(isOurs);
                const score = m ? ourScore(m) : null;
                return (
                  <span key={ds} className={`cal-cell ${d.getMonth() !== first.getMonth() ? "out" : ""} ${ds === today ? "today" : ""}`}>
                    <span className="cal-no">{d.getDate()}</span>
                    {m && (
                      <span className={`cal-match ${score ? outcome(score[0], score[1]) : ""} ${m.home === US ? "h" : "a"}`}>
                        <TeamLogo team={opponent(m)} size={18} />
                        <span>{score ? `${score[0]}-${score[1]}` : (m.time ?? (m.home === US ? "T" : "U"))}</span>
                      </span>
                    )}
                    {training(d).length > 0 && !m && <span className="cal-train" aria-label="Training" />}
                  </span>
                );
              })}
            </button>

            <div className={`reveal ${isOpen ? "on" : ""}`}>
              <div>
                <div className="cal-detail">
                  {/* Op volgorde van de week: per dag de trainingen en onze wedstrijd */}
                  {week.flatMap((d) => [
                    ...training(d).map((t) => (
                      <div key={`${iso(d)}-${t.time}`} className="cal-item train">
                        <span className="cal-when">
                          <b>{DAYS[(d.getDay() + 6) % 7]}</b> {d.getDate()}
                        </span>
                        <span>Training</span>
                        <span className="time">{t.time}</span>
                      </div>
                    )),
                    ...mine.filter((m) => m.date === iso(d)).map((m) => <OurMatch key={m.id} m={m} />),
                  ])}
                  {others.length > 0 && <Others list={others} />}
                  {!mine.length && !others.length && !week.some((d) => training(d).length) && <p className="meta">Niets gepland.</p>}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {undated.length > 0 && (
        <div className="cal-undated">
          <span className="k">Nog niet ingepland</span>
          {undated.map((m) => (
            <Link key={m.id} href={`/competitie/?w=${encodeURIComponent(m.id)}`} className="cal-item">
              <span className={`ha ${m.home === US ? "h" : "a"}`}>{m.home === US ? "Thuis" : "Uit"}</span>
              <span className="tname">
                <TeamLogo team={opponent(m)} size={18} />
                <span>{opponent(m)}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

/** Onze wedstrijd in een opengeklapte week: groot en direct aan te tikken */
function OurMatch({ m }: { m: ViewMatch }) {
  const { view } = useData();
  const d = parse(m.date!);
  const score = ourScore(m);
  const chance = !score && hasPrediction(view, m) ? predict(view.model, US, opponent(m), m.home === US).win : null;
  return (
    <Link href={`/competitie/?w=${encodeURIComponent(m.id)}`} className="cal-item ours">
      <span className="cal-when">
        <b>{DAYS[(d.getDay() + 6) % 7]}</b> {d.getDate()}
      </span>
      <span className="cal-opp">
        <span className={`ha ${m.home === US ? "h" : "a"}`}>{m.home === US ? "Thuis" : "Uit"}</span>
        <TeamLogo team={opponent(m)} size={22} />
        <span>
          <b>{opponent(m)}</b>
          <small>
            {m.time ?? "tijd volgt"}
            {m.venue ? ` · ${m.venue}` : ""}
            {m.kind !== "competitie" ? ` · ${m.kind}` : ""}
          </small>
        </span>
      </span>
      {score ? (
        <Score home={m.homeGoals!} away={m.awayGoals!} ours={score} />
      ) : chance !== null ? (
        <span className="pct">
          {pct(chance)}%<small>winkans</small>
        </span>
      ) : (
        <span />
      )}
    </Link>
  );
}

/** Andere wedstrijden in die week: ingeklapt, open met één tik */
function Others({ list }: { list: ViewMatch[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="cal-others">
      <button type="button" className="link" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "Verberg" : "Toon"} {list.length} andere wedstrijd{list.length === 1 ? "" : "en"}
      </button>
      {open &&
        list.map((m) => (
          <div key={m.id} className="cal-other">
            <span className="tname">
              <TeamLogo team={m.home} size={14} />
              <span>{m.home}</span>
            </span>
            {isPlayed(m) ? <Score home={m.homeGoals} away={m.awayGoals} /> : <span className="time">{m.time ?? ""}</span>}
            <span className="tname r">
              <span>{m.away}</span>
              <TeamLogo team={m.away} size={14} />
            </span>
          </div>
        ))}
    </div>
  );
}
