"use client";

import { useData } from "@/components/DataProvider";
import { assignedGoals } from "@/lib/domain/stats";
import { ourScore, playerLabel } from "@/lib/domain/types";
import type { ViewMatch } from "@/lib/store/view";

/** Gespeelde wedstrijd bekijken: goals, assists, keeper, kaarten, aanwezigen (PLAN.md §3.3) */
export function EntryView({ match, onEdit }: { match: ViewMatch; onEdit: () => void }) {
  const { view } = useData();
  const e = view.entries[match.id];
  const [us, them] = ourScore(match)!;
  const name = (id: string) => playerLabel(view.players.find((p) => p.id === id));

  if (!e) {
    return (
      <section className="box">
        <div className="box-b">
          <p className="muted" style={{ margin: "0 0 12px" }}>
            Nog geen opstelling of stats voor deze wedstrijd.
            {match.kind !== "competitie" && ` ${match.kind[0].toUpperCase()}${match.kind.slice(1)}: telt niet mee voor de statistieken.`}
          </p>
          <button className="btn primary" type="button" onClick={onEdit}>
            Opstelling en stats invoeren
          </button>
        </div>
      </section>
    );
  }

  const stats = Object.entries(e.stats);
  const goals = stats.filter(([, s]) => s.goals).sort((a, b) => b[1].goals - a[1].goals);
  const assists = stats.filter(([, s]) => s.assists).sort((a, b) => b[1].assists - a[1].assists);
  const cards = stats.filter(([, s]) => s.yellow || s.red);
  const sum = assignedGoals(e);
  const present = e.attendance.map((id) => view.players.find((p) => p.id === id)).filter((p) => !!p);

  return (
    <>
      <div className="grid2">
        <section className="box">
          <div className="box-h">
            <p className="lbl">Goals en assists</p>
          </div>
          <div className="box-b">
            {e.goals ? (
              // Per doelpunt, in volgorde van invoer
              e.goals.map((g, i) => (
                <div className="ev" key={`gg${i}`}>
                  <span>
                    <b className="num" style={{ marginRight: 8 }}>
                      {i + 1}.
                    </b>
                    {g.scorerId ? name(g.scorerId) : <span className="muted">Eigen goal tegenstander</span>}
                    {g.assistId && <span className="muted"> · assist {name(g.assistId)}</span>}
                  </span>
                  {g.kind !== "spel" && <span className="goal-kind">{g.kind}</span>}
                </div>
              ))
            ) : (
              <>
                {goals.map(([id, s]) => (
                  <div className="ev" key={`g${id}`}>
                    <span>{name(id)}</span>
                    <span className="num">{s.goals}× goal</span>
                  </div>
                ))}
            {!e.goals && e.opponentOwnGoals > 0 && (
              <div className="ev">
                <span className="muted">Eigen goal tegenstander</span>
                <span className="num">{e.opponentOwnGoals}×</span>
              </div>
            )}
                {assists.map(([id, s]) => (
                  <div className="ev" key={`a${id}`}>
                    <span>{name(id)}</span>
                    <span className="num muted">{s.assists}× assist</span>
                  </div>
                ))}
              </>
            )}
            {!goals.length && !e.opponentOwnGoals && <span className="muted">Geen goals ingevoerd.</span>}
            {sum !== us && (
              <div className="note warn">
                {sum} van {us} goals toegewezen.
              </div>
            )}
          </div>
        </section>
        <section className="box">
          <div className="box-h">
            <p className="lbl">Keeper en kaarten</p>
          </div>
          <div className="box-b">
            <div className="ev">
              <span className="muted">Keeper</span>
              <span>{e.keeperId ? name(e.keeperId) : "–"}</span>
            </div>
            <div className="ev">
              <span className="muted">Tegen / clean sheet</span>
              <span>
                {them} / {them === 0 ? "ja" : "nee"}
              </span>
            </div>
            {stats
              .filter(([, x]) => x.ownGoals)
              .map(([id, x]) => (
                <div className="ev" key={`og${id}`}>
                  <span>
                    <span className="og-dot" /> Eigen goal{x.ownGoals! > 1 ? ` (${x.ownGoals}×)` : ""}
                  </span>
                  <span>{name(id)}</span>
                </div>
              ))}
            {cards.map(([id, s]) => (
              <div className="ev" key={`c${id}`}>
                <span>
                  <span className={`ci ${s.red ? "cr" : "cy"}`} />{" "}
                  {s.red && s.yellow ? "Rood (2× geel)" : s.red ? "Rood" : "Geel"}
                </span>
                <span>{name(id)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="box" style={{ marginTop: 14 }}>
        <div className="box-h">
          <p className="lbl">Aanwezig ({present.length})</p>
          <span className="meta">{present.filter((p) => p.type === "leen").length} leenspelers</span>
        </div>
        <div className="box-b chips">
          {present.map((p) => (
            <span className="chip" key={p.id}>
              {playerLabel(p)}
              {p.type === "leen" && <span className="t">leen</span>}
            </span>
          ))}
        </div>
      </section>
      <div className="actions">
        <button className="btn" type="button" onClick={onEdit}>
          Bewerken
        </button>
      </div>
    </>
  );
}
