"use client";

import { useState } from "react";
import { Medal } from "@/components/Badges";
import { useData } from "@/components/DataProvider";
import { InfoTip } from "@/components/InfoTip";
import { Shirt } from "@/components/Shirt";
import type { Award, KeeperCompare } from "@/lib/domain/awards";
import { playerLabel, US } from "@/lib/domain/types";
import type { StoredPlayer } from "@/lib/store/schema";

const comma = (x: number, d = 1) => x.toFixed(d).replace(".", ",");

/** Prijzen: per prijs de koploper groot, met "Bekijk ranglijst" voor plek 2 t/m 5 */
export default function PrijzenPage() {
  const { view } = useData();
  const byId = new Map(view.players.map((p) => [p.id, p]));

  if (!view.rows.length) {
    return (
      <section className="box">
        <div className="box-b muted" style={{ paddingTop: 16 }}>
          Nog geen wedstrijden met stats ingevoerd. Na de eerste invoer staan hier de prijzen.
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="sec-h">
        <p className="lbl">Prijzenrace</p>
        <span className="meta">na {view.rows.length} ingevoerde duels</span>
      </div>
      <div className="awards">
        {view.awards.map((a) => (
          <AwardCard key={a.key} a={a} byId={byId} />
        ))}
      </div>
    </>
  );
}

function AwardCard({ a, byId }: { a: Award; byId: Map<string, StoredPlayer> }) {
  const [open, setOpen] = useState(false);
  const leadRow = a.rows.find((r) => r.playerId === a.leader);
  const lead = a.leader ? byId.get(a.leader) : undefined;
  const rest = a.rows.filter((r) => r.playerId !== a.leader).slice(0, 4);

  return (
    <section className="box award">
      <div className="award-h">
        <Medal kind={a.key} size={42} />
        <div>
          <h3>{a.title}</h3>
          <p>{a.who}</p>
        </div>
        <InfoTip label={`Hoe werkt ${a.title}?`}>{a.how}</InfoTip>
      </div>

      {lead && leadRow ? (
        <div className="award-lead">
          <Shirt player={lead} size={56} />
          <div>
            <div className="k">Koploper</div>
            <div className="name">{playerLabel(lead)}</div>
            <div className="meta">{leadRow.detail}</div>
          </div>
          <div className="val">
            <span className="num">{leadRow.display}</span>
            <small>{leadRow.unit}</small>
          </div>
        </div>
      ) : (
        <div className="award-empty">Nog geen koploper: nog niemand heeft genoeg duels of iets gepresteerd.</div>
      )}

      {a.compare && <Compare c={a.compare} />}

      {rest.length > 0 && (
        <>
          <button type="button" className="award-more" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? "Minder" : "Bekijk ranglijst"}
            <span className={`chev ${open ? "up" : ""}`} aria-hidden="true" />
          </button>
          <div className={`reveal ${open ? "on" : ""}`}>
            <div>
              <div className="award-rows">
                {rest.map((r) => {
                  const p = byId.get(r.playerId);
                  const rank = a.rows.indexOf(r) + 1;
                  return (
                    <div key={r.playerId} className={`arow ${r.eligible ? "" : "out"}`}>
                      <span className="rank">{rank}</span>
                      {p ? <Shirt player={p} size={28} /> : <span />}
                      <span className="who">
                        <b>{playerLabel(p)}</b>
                        <small>{r.eligible ? r.detail : `${r.detail} · nog te weinig duels`}</small>
                      </span>
                      <span className="num">
                        {r.display}
                        <small>{r.unit}</small>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
      {!rest.length && <div style={{ height: 16 }} />}
    </section>
  );
}

/** Gouden Handschoen: hoe onze keeper het doet tegenover de verdedigingen van de rest van de poule */
function Compare({ c }: { c: KeeperCompare }) {
  const best = c.best;
  return (
    <p className="award-cmp">
      <span aria-hidden="true">🏟️</span>
      <span>
        {c.rank === 1 ? (
          <>
            <b>Beste van de competitie:</b> {comma(c.perGame)} tegen per duel
            {best && (
              <>
                , de beste andere verdediging ({best.team}) krijgt er {comma(best.perGame)}
              </>
            )}
            .
          </>
        ) : (
          <>
            <b>
              {c.rank}e van {c.teams}
            </b>{" "}
            als je zijn {comma(c.perGame)} tegen per duel naast de verdedigingen van de poule legt
            {best && (
              <>
                {" "}
                (beste: {best.team}, {comma(best.perGame)})
              </>
            )}
            .
          </>
        )}{" "}
        <span className="muted">Van andere teams is alleen het totaal bekend, niet per keeper. {US} zelf telt niet mee.</span>
      </span>
    </p>
  );
}
