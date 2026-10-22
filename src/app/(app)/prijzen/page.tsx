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
  const leads = a.leaders.map((id) => ({ p: byId.get(id), r: a.rows.find((r) => r.playerId === id)! })).filter((x) => x.p);
  const shared = leads.length > 1;
  const rest = a.rows.filter((r) => !a.leaders.includes(r.playerId)).slice(0, 4);

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

      {leads.length ? (
        <div className="award-lead">
          <span className="award-shirts">
            {leads.slice(0, 3).map(({ p }) => (
              <Shirt key={p!.id} player={p!} size={shared ? 44 : 56} />
            ))}
          </span>
          <div>
            <div className="k">{shared ? `Gedeelde koplopers (${leads.length})` : "Koploper"}</div>
            <div className="name">{leads.map(({ p }) => playerLabel(p)).join(" & ")}</div>
            {!shared && <div className="meta">{leads[0].r.detail}</div>}
          </div>
          <div className="val">
            <span className="num">{leads[0].r.display}</span>
            <small>{leads[0].r.unit}</small>
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
                  // Gedeelde plek: zelfde nummer als wie hetzelfde getal heeft
                  const rank = a.rows.findIndex((x) => x.display === r.display) + 1;
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
