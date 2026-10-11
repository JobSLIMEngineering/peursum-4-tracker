"use client";

import Link from "next/link";
import { TeamLogo } from "@/components/TeamLogo";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useData } from "@/components/DataProvider";
import { Score } from "@/components/ui";
import { predict } from "@/lib/domain/model";
import { buildRounds, isRoundDone, ourMatch, splitRounds, type RoundGroup } from "@/lib/domain/rounds";
import { isOurs, isPlayed, opponent, ourScore, outcome, US } from "@/lib/domain/types";
import { fmtDate, pct, todayNL } from "@/lib/format";
import { hasPrediction, type AppView, type ViewMatch } from "@/lib/store/view";

const OPEN_KEY = "p4-open-rounds";
const ONLY_OURS_KEY = "p4-only-ours";
const COLLAPSED_KEY = "p4-collapsed-sections";

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
  const { view, mutate, readOnly } = useData();
  const router = useRouter();
  const groups = buildRounds(view.matches);
  const { upcoming, done, defaultOpen } = splitRounds(groups, todayNL());
  const [open, setOpen] = useState<string[] | null>(null);
  const [onlyOurs, setOnlyOurs] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>([]);

  // Open/dicht per apparaat onthouden; standaard de eerstvolgende en de laatst gespeelde ronde
  useEffect(() => {
    queueMicrotask(() => {
      setOpen(loadOpen() ?? defaultOpen);
      try {
        setOnlyOurs(localStorage.getItem(ONLY_OURS_KEY) === "1");
        setCollapsed(JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? "[]") as string[]);
      } catch {
        // geen opslag: standaard alle wedstrijden tonen
      }
    });
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

  const toggleOnlyOurs = () =>
    setOnlyOurs((v) => {
      try {
        localStorage.setItem(ONLY_OURS_KEY, v ? "0" : "1");
      } catch {
        // niet onthouden is geen probleem
      }
      return !v;
    });

  /** Hele blok "Komende" of "Gespeelde rondes" in- of uitklappen (onthouden per apparaat) */
  const toggleSection = (key: "up" | "done") =>
    setCollapsed((cur) => {
      const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      } catch {
        // niet onthouden is geen probleem
      }
      return next;
    });

  /** Naar een ronde springen vanuit de rondebalk: openklappen en ernaartoe scrollen */
  const jump = (key: string) => {
    const g = groups.find((x) => x.key === key);
    const section = g && isRoundDone(g, todayNL()) ? "done" : "up";
    if (collapsed.includes(section)) toggleSection(section);
    setOpen((cur) => {
      const next = (cur ?? []).includes(key) ? cur! : [...(cur ?? []), key];
      saveOpen(next);
      return next;
    });
    requestAnimationFrame(() =>
      document.getElementById(`ronde-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  if (!open) return null;

  const nextKey = defaultOpen[0];
  return (
    <>
    <RoundBar groups={groups} nextKey={nextKey} onJump={jump} />
    <label className="only-ours">
      <input type="checkbox" checked={onlyOurs} onChange={toggleOnlyOurs} /> Alleen wedstrijden van Peursum 4
    </label>
    <div className="grid2" style={{ alignItems: "start" }}>
      <section className="box">
        <div className="box-h">
          <SectionToggle label="Komende rondes" count={upcoming.length} closed={collapsed.includes("up")} onClick={() => toggleSection("up")} />
          {!readOnly && (
            <button className="btn sm" type="button" onClick={addMatch}>
              + Wedstrijd
            </button>
          )}
        </div>
        {!collapsed.includes("up") && (
          <div className="rnds">
            {upcoming.map((g) => (
              <Round key={g.key} g={g} view={view} open={open.includes(g.key)} onToggle={toggle} onlyOurs={onlyOurs} />
            ))}
          </div>
        )}
      </section>
      <section className="box">
        <div className="box-h">
          <SectionToggle label="Gespeelde rondes" count={done.length} closed={collapsed.includes("done")} onClick={() => toggleSection("done")} />
        </div>
        {!collapsed.includes("done") && (
          <div className="rnds">
            {done.map((g) => (
              <Round key={g.key} g={g} view={view} open={open.includes(g.key)} onToggle={toggle} onlyOurs={onlyOurs} />
            ))}
          </div>
        )}
      </section>
    </div>
    </>
  );
}

function Round({
  g,
  view,
  open,
  onToggle,
  onlyOurs,
}: {
  g: RoundGroup;
  view: AppView;
  open: boolean;
  onToggle: (key: string, open: boolean) => void;
  onlyOurs: boolean;
}) {
  const shown = onlyOurs ? g.matches.filter(isOurs) : g.matches;
  const side = g.kind !== "ronde";
  const title = g.kind === "ronde" ? `Ronde ${g.round}` : g.kind === "inhaal" ? "Inhaal" : "Extra";
  const badge = g.kind === "ronde" ? g.round : g.kind === "inhaal" ? "IN" : "+";

  return (
    <details
      id={`ronde-${g.key}`}
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
        {shown.map((m) => (
          <MatchRow key={m.id} m={m as ViewMatch} view={view} />
        ))}
        {!shown.length && <div className="prow2 muted">Peursum 4 speelt deze ronde niet.</div>}
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
        <TeamLogo team={opponent(o)} size={18} /> <b>{opponent(o)}</b>{" "}
        <span className="muted">{o.home === US ? "thuis" : "uit"}</span>
      </span>
      {chip}
    </>
  );
}

function MatchRow({ m, view }: { m: ViewMatch; view: AppView }) {
  const { readOnly } = useData();
  const ours = isOurs(m);
  const team = (t: string) => (
    <span className={`tname ${t === US ? "us-t" : ""}`}>
      <TeamLogo team={t} size={16} />
      <span>{t}</span>
    </span>
  );

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
      ) : m.kind === "competitie" && !readOnly ? (
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

/** Rondebalk 1–22: kleur = uitslag van Peursum, rode rand = eerstvolgende ronde */
function RoundBar({
  groups,
  nextKey,
  onJump,
}: {
  groups: RoundGroup[];
  nextKey: string | undefined;
  onJump: (key: string) => void;
}) {
  const rounds = groups
    .filter((g): g is Extract<RoundGroup, { kind: "ronde" }> => g.kind === "ronde")
    .sort((a, b) => a.round - b.round);

  return (
    <nav className="roundbar" aria-label="Spring naar ronde">
      {rounds.map((g) => {
        const o = ourMatch(g);
        const score = o ? ourScore(o) : null;
        const cls = score ? outcome(score[0], score[1]) : o && !o.date ? "nd" : !o ? "free" : "";
        const label = score
          ? `Ronde ${g.round}: ${score[0]}-${score[1]}`
          : o
            ? `Ronde ${g.round}: ${opponent(o)}${o.date ? "" : " (niet ingepland)"}`
            : `Ronde ${g.round}: vrij`;
        return (
          <button
            key={g.key}
            type="button"
            className={`rb ${cls} ${g.key === nextKey ? "next" : ""}`}
            onClick={() => onJump(g.key)}
            aria-label={label}
            title={label}
          >
            {g.round}
          </button>
        );
      })}
    </nav>
  );
}

/** Kop van een blok die het hele blok in- of uitklapt */
function SectionToggle({
  label,
  count,
  closed,
  onClick,
}: {
  label: string;
  count: number;
  closed: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="sec-toggle" aria-expanded={!closed} onClick={onClick}>
      <span className="lbl">
        {label} <span className="sec-count">{count}</span>
      </span>
      <span className={`chev ${closed ? "" : "up"}`} aria-hidden="true" />
    </button>
  );
}
