"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useData } from "@/components/DataProvider";
import { Score } from "@/components/ui";
import { predict } from "@/lib/domain/model";
import { buildRounds, ourMatch, splitRounds, type RoundGroup } from "@/lib/domain/rounds";
import { isOurs, isPlayed, opponent, ourScore, US } from "@/lib/domain/types";
import { fmtDate, pct, todayNL } from "@/lib/format";
import { hasPrediction, type AppView, type ViewMatch } from "@/lib/store/view";

const OPEN_KEY = "p4-open-rounds";

function loadOpen(): string[] | null {
  try {
    const raw = localStorage.getItem(OPEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function saveOpen(keys: string[]) {
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify(keys));
  } catch {
    // niet onthouden is geen probleem
  }
}

export function RoundsList() {
  const { view, mutate } = useData();
  const router = useRouter();
  const groups = buildRounds(view.matches);
  const { upcoming, done, defaultOpen } = splitRounds(groups, todayNL());
  const [open, setOpen] = useState<string[] | null>(null);

  // Open/dicht per apparaat onthouden; standaard de eerstvolgende en de laatst gespeelde ronde
  useEffect(() => {
    queueMicrotask(() => setOpen(loadOpen() ?? defaultOpen));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- alleen bij openen van het scherm
  }, []);

  const toggle = (key: string, isOpen: boolean) => {
    setOpen((cur) => {
      const next = (cur ?? []).filter((k) => k !== key).concat(isOpen ? [key] : []);
      saveOpen(next);
      return next;
    });
  };

  async function addMatch() {
    const last = view.matches
      .filter((m) => isOurs(m) && !isPlayed(m) && m.date)
      .map((m) => m.date!)
      .sort()
      .at(-1);
    const date = last ? new Date(new Date(`${last}T12:00`).getTime() + 7 * 864e5).toISOString().slice(0, 10) : null;
    const id = `extra-${Date.now().toString(36)}`;
    await mutate(
      "overrides.json",
      (o) => ({
        ...o,
        extra: [
          ...o.extra,
          {
            id,
            code: null,
            round: null,
            makeup: false,
            date,
            time: "12:30",
            home: US,
            away: "Tegenstander",
            homeGoals: null,
            awayGoals: null,
            venue: null,
            kind: "oefen",
            status: "gepland",
            source: "handmatig",
          },
        ],
      }),
      "wedstrijd toegevoegd",
    );
    router.push(`/competitie/?w=${id}&wijzigen=1`);
  }

  if (!open) return null;

  return (
    <div className="grid2" style={{ alignItems: "start" }}>
      <section className="box">
        <div className="box-h">
          <p className="lbl">Komende rondes</p>
          <button className="btn sm" type="button" onClick={addMatch}>
            + Wedstrijd
          </button>
        </div>
        <div className="rnds">
          {upcoming.map((g) => (
            <Round key={g.key} g={g} view={view} open={open.includes(g.key)} onToggle={toggle} />
          ))}
        </div>
      </section>
      <section className="box">
        <div className="box-h">
          <p className="lbl">Gespeelde rondes</p>
        </div>
        <div className="rnds">
          {done.map((g) => (
            <Round key={g.key} g={g} view={view} open={open.includes(g.key)} onToggle={toggle} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Round({
  g,
  view,
  open,
  onToggle,
}: {
  g: RoundGroup;
  view: AppView;
  open: boolean;
  onToggle: (key: string, open: boolean) => void;
}) {
  const side = g.kind !== "ronde";
  const title = g.kind === "ronde" ? `Ronde ${g.round}` : g.kind === "inhaal" ? "Inhaal" : "Extra";
  const badge = g.kind === "ronde" ? g.round : g.kind === "inhaal" ? "IN" : "+";

  return (
    <details
      className={`rnd${side ? " side" : ""}`}
      open={open}
      onToggle={(e) => {
        const isOpen = (e.currentTarget as HTMLDetailsElement).open;
        if (isOpen !== open) onToggle(g.key, isOpen);
      }}
    >
      <summary>
        <span className="rn">{badge}</span>
        <span className="rt">
          <span className="rd">
            {title} · {g.date ? fmtDate(g.date).full : "datum onbekend"}
          </span>
          <span className="rl">
            <Summary g={g} view={view} />
          </span>
        </span>
        <span className="chev" aria-hidden="true" />
      </summary>
      <div className="rnd-b">
        {g.matches.map((m) => (
          <MatchRow key={m.id} m={m as ViewMatch} view={view} />
        ))}
      </div>
    </details>
  );
}

function Summary({ g, view }: { g: RoundGroup; view: AppView }) {
  const o = ourMatch(g);
  if (!o) {
    return (
      <>
        <span className="rs-us muted">{g.kind === "inhaal" ? "" : "Peursum vrij"}</span>
        <span />
      </>
    );
  }
  const score = ourScore(o);
  let chip: React.ReactNode;
  if (score) chip = <Score home={o.homeGoals!} away={o.awayGoals!} ours={score} />;
  else if (!o.date) chip = <span className="rs-tag">niet ingepland</span>;
  else if (hasPrediction(view, o))
    chip = <span className="rs-pct">{pct(predict(view.model, US, opponent(o), o.home === US).win)}%</span>;
  else chip = <span className="rs-tag">{o.time ?? ""}</span>;

  return (
    <>
      <span className="rs-us">
        <b>{opponent(o)}</b> <span className="muted">{o.home === US ? "thuis" : "uit"}</span>
      </span>
      {chip}
    </>
  );
}

function MatchRow({ m, view }: { m: ViewMatch; view: AppView }) {
  const ours = isOurs(m);
  const team = (t: string) => <span className={t === US ? "us-t" : ""}>{t}</span>;

  let right: React.ReactNode;
  if (isPlayed(m)) right = <Score home={m.homeGoals} away={m.awayGoals} ours={ours ? ourScore(m)! : undefined} />;
  else if (ours && hasPrediction(view, m))
    right = (
      <span className="pct">
        {pct(predict(view.model, US, opponent(m), m.home === US).win)}%<small>winkans</small>
      </span>
    );
  else right = <span className="time">{m.time ?? ""}</span>;

  let sub: React.ReactNode = null;
  if (ours) {
    if (isPlayed(m)) {
      const e = view.entries[m.id];
      sub = e ? (
        `${e.attendance.length} aanwezig · stats ingevoerd`
      ) : m.kind === "competitie" ? (
        <span className="todo">Opstelling en stats invoeren</span>
      ) : (
        m.kind
      );
    } else {
      sub = (
        <>
          {m.date ? (m.time ?? "tijd onbekend") : "niet ingepland"}
          {m.venue ? ` · ${m.venue}` : ""}
          {m.kind !== "competitie" ? ` · ${m.kind}` : ""}
          {m.edited && (
            <>
              {" · "}
              <span className="todo">aangepast</span>
            </>
          )}
        </>
      );
    }
  }

  const inner = (
    <>
      <div>
        <div className="pm">
          {team(m.home)} <span className="muted">–</span> {team(m.away)}
        </div>
        {sub && <div className="meta">{sub}</div>}
      </div>
      {right}
    </>
  );

  return ours ? (
    <Link className="prow2 ours" href={`/competitie/?w=${encodeURIComponent(m.id)}`}>
      {inner}
    </Link>
  ) : (
    <div className="prow2">{inner}</div>
  );
}
