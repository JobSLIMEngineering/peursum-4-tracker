"use client";

import { useMemo, useState } from "react";
import { scenario, winterBreak, type Scenario } from "@/lib/domain/scenario";
import { opponent, US } from "@/lib/domain/types";
import { fmtDate, todayNL } from "@/lib/format";
import type { AppView } from "@/lib/store/view";
import { InfoTip } from "./InfoTip";
import { Box } from "./ui";

const pc = (x: number | null) => (x == null ? "–" : `${Math.round(x * 100)}%`);
const goal = (t: number) => (t === 1 ? "1e" : `top ${t}`);

/**
 * Scenario's: wat moet er gebeuren om bij de winterstop of aan het eind minimaal op een bepaalde plek
 * te staan? In eigen hand of niet, wat de concurrenten dan nog mogen, en de kans per aantal zeges.
 */
export function ScenarioBox({ view }: { view: AppView }) {
  const today = todayNL();
  const winter = useMemo(() => winterBreak(view.matches, today), [view.matches, today]);
  const us = view.standings.find((s) => s.team === US);
  const n = view.standings.length;
  const [moment, setMoment] = useState<"winter" | "eind">("winter");
  const [target, setTarget] = useState(() => Math.max(1, (us?.position ?? 2) - 1));
  const deadline = moment === "winter" && winter ? winter : null;
  const s = useMemo(
    () => (us && n > 2 ? scenario(view.model, view.standings, view.matches, { deadline, target }) : null),
    [view.model, view.standings, view.matches, deadline, target, us, n],
  );
  if (!s || !us) return null;
  const targets = [1, 2, 3, 5].filter((t) => t < n);
  const when = deadline ? "bij de winterstop" : "aan het eind van het seizoen";

  return (
    <Box
      label="Scenario's"
      right={
        <InfoTip label="Hoe werkt dit?">
          Eerst gewoon rekenen: als we alles winnen, kan dan nog iemand over ons heen? Daarna wordt de rest{" "}
          {deadline ? "tot de winterstop" : "van het seizoen"} duizenden keren nagespeeld met het winkansmodel, net als de
          kampioenskans. Zo zie je de kans per aantal zeges en wat elke wedstrijd uitmaakt. Bij gelijke punten telt het
          doelsaldo.
        </InfoTip>
      }
    >
      <div className="scn-controls">
        {winter && (
          <div className="seg" role="group" aria-label="Moment">
            <button type="button" aria-pressed={moment === "winter"} onClick={() => setMoment("winter")}>
              Winterstop
            </button>
            <button type="button" aria-pressed={moment === "eind"} onClick={() => setMoment("eind")}>
              Einde seizoen
            </button>
          </div>
        )}
        <div className="chart-pick" role="tablist" aria-label="Doel">
          {targets.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={t === target} onClick={() => setTarget(t)}>
              {goal(t)}
            </button>
          ))}
        </div>
      </div>

      <div className="lineup-head">
        <span className="num lineup-pct">{pc(s.chance)}</span>
        <span>
          <b>
            kans om {when} {target === 1 ? "bovenaan" : `in de ${goal(target)}`} te staan
          </b>
          <span className="meta">
            Nu {us.position}e met {us.points} punten{deadline ? ` · winterstop na ${fmtDate(deadline).full}` : ""} · nog{" "}
            {s.ours.length} {s.ours.length === 1 ? "wedstrijd" : "wedstrijden"}
          </span>
        </span>
      </div>

      <Verdict s={s} when={when} />

      {s.ours.length > 0 && s.status !== "zeker" && s.status !== "onmogelijk" && (
        <>
          <p className="lbl scn-h">Kans per aantal zeges</p>
          <ul className="scn-wins">
            {[...s.byWins].filter((w) => w.chance != null).reverse().map((w) => (
              <li key={w.wins}>
                <span>
                  {w.wins === s.ours.length ? `Alles winnen (${w.wins})` : w.wins === 0 ? "Geen enkele zege" : `${w.wins} van de ${s.ours.length}`}
                </span>
                <span className="scn-bar" aria-hidden="true">
                  <i style={{ width: `${Math.round((w.chance ?? 0) * 100)}%` }} />
                </span>
                <b>{pc(w.chance)}</b>
              </li>
            ))}
          </ul>
          <Need s={s} />

          <p className="lbl scn-h">Wat elke wedstrijd uitmaakt</p>
          <p className="meta" style={{ margin: "0 0 6px" }}>
            De kans op het doel bij winst (W), gelijk (G) of verlies (V) in die wedstrijd.
          </p>
          <ul className="scn-matches">
            {s.perMatch.slice(0, 6).map((p) => (
              <li key={p.match.id}>
                <span>
                  <b>{p.match.home === US ? "Thuis" : "Uit"} tegen {opponent(p.match)}</b>
                  <small className="meta">{p.match.date ? fmtDate(p.match.date).full : "datum volgt"}</small>
                </span>
                <span className="scn-wdl">
                  <span className="scn-w">W {pc(p.win)}</span>
                  <span className="scn-d">G {pc(p.draw)}</span>
                  <span className="scn-l">V {pc(p.loss)}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Box>
  );
}

function Verdict({ s, when }: { s: Scenario; when: string }) {
  const n = s.ours.length;
  const doel = s.target === 1 ? "bovenaan" : `in de ${goal(s.target)}`;
  if (s.status === "zeker") return <p className="note scn-v good">Al zeker: ook als we alles verliezen, staan we {when} {doel}.</p>;
  if (s.status === "onmogelijk") return <p className="note warn scn-v">Niet meer haalbaar: zelfs met alles winnen ({s.maxPoints} punten) komen we er niet meer.</p>;
  if (s.status === "eigen hand")
    return (
      <p className="note scn-v good">
        <b>In eigen hand.</b> Win {n === 1 ? "de laatste wedstrijd" : `alle ${n} wedstrijden`} en we staan {when} zeker {doel}, wat de rest ook doet.
      </p>
    );
  if (s.status === "doelsaldo")
    return (
      <p className="note scn-v">
        <b>Bijna in eigen hand.</b> Met alles winnen ({s.maxPoints} punten) kan nog een ploeg gelijk komen; dan beslist het doelsaldo. Dus: winnen, en ruim.
      </p>
    );
  return (
    <div className="note warn scn-v">
      <b>Niet meer in eigen hand.</b> Ook als we alles winnen ({s.maxPoints} punten) moet{s.mustDrop === 1 ? "" : "en"}{" "}
      {s.mustDrop === s.rivals.length ? (s.rivals.length === 1 ? "deze ploeg" : s.rivals.length === 2 ? "beide ploegen" : "al deze ploegen") : s.mustDrop === 1 ? "één van deze ploegen" : `${s.mustDrop} van deze ploegen`} punten laten liggen:
      <ul className="scn-rivals">
        {s.rivals.map((r) => (
          <li key={r.team}>
            <b>{r.team}</b> ({r.points} pnt, nog {r.games} {r.games === 1 ? "duel" : "duels"}):{" "}
            {r.allowed === 0 ? "mag geen punt meer halen" : `mag nog maximaal ${r.allowed} van de ${3 * r.games} punten halen`}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Hoeveel zeges heb je minstens nodig voor een redelijke kans? */
function Need({ s }: { s: Scenario }) {
  const fifty = s.byWins.find((w) => (w.chance ?? 0) >= 0.5);
  const key = [...s.perMatch].sort((a, b) => (b.win ?? 0) - (b.loss ?? 0) - ((a.win ?? 0) - (a.loss ?? 0)))[0];
  return (
    <p className="meta scn-need">
      {fifty
        ? fifty.wins === 0
          ? "Ook zonder zege is de kans al meer dan 50%."
          : `Voor meer dan 50% kans: minstens ${fifty.wins} van de ${s.ours.length} winnen.`
        : "Zelfs met alles winnen is de kans kleiner dan 50%: we hebben hulp van anderen nodig."}
      {key && s.perMatch.length > 1 && key.win != null && key.loss != null && (
        <>
          {" "}
          De belangrijkste is {key.match.home === US ? "thuis" : "uit"} tegen {opponent(key.match)}: winst geeft {pc(key.win)}, verlies {pc(key.loss)}.
        </>
      )}
    </p>
  );
}
