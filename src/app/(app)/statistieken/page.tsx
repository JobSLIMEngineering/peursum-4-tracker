"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useData } from "@/components/DataProvider";
import { FormChart } from "@/components/FormChart";
import { InfoTip } from "@/components/InfoTip";
import { Shirt } from "@/components/Shirt";
import { Box } from "@/components/ui";
import { duos, seasonForm } from "@/lib/domain/insights";
import { playerLabel } from "@/lib/domain/types";

const comma = (x: number, d = 1) => x.toFixed(d).replace(".", ",");
const signed = (x: number, d = 1) => (x >= 0 ? "+" : "−") + comma(Math.abs(x), d);

/** Statistieken: vorm door het seizoen (gecorrigeerd voor de tegenstanders) en de duo's */
export default function StatistiekenPage() {
  const { view } = useData();
  const form = useMemo(() => seasonForm(view.model, view.matches, view.pool), [view]);
  const pairs = useMemo(() => duos(view.matches, view.entries).slice(0, 5), [view]);
  const last = form.at(-1);
  const byId = (id: string) => view.players.find((p) => p.id === id);
  // Vorm nu (laatste 5) en hoe het begon (eerste 5), om de lijn over het seizoen te duiden
  const start = form[Math.min(4, form.length - 1)];

  return (
    <>
      <Link href="/wrapped/" className="wrapped-banner">
        <span>
          <span className="k">Tussenstand in beeld</span>
          <b>Peursum 4 Wrapped</b>
        </span>
        <span aria-hidden="true">▶</span>
      </Link>

      <Box
        label="Vorm door het seizoen"
        style={{ marginTop: 16 }}
        right={
          <InfoTip label="Hoe werkt dit?">
            Per wedstrijd rekent het model uit hoeveel punten we gemiddeld zouden halen tegen die tegenstander (thuis of
            uit, met de sterkte van beide teams over het hele seizoen). De vorm is het gemiddelde verschil over de laatste
            5 duels, zodat één uitschieter het beeld niet bepaalt. Ook na de winterstop telt alles van het seizoen mee.
          </InfoTip>
        }
      >
        {last && (
          <div className="form-tiles">
            <div>
              <span className="k">Vorm nu</span>
              <span className={`num ${last.form >= 0 ? "up" : "down"}`}>{signed(last.form)}</span>
              <span className="meta">pnt per duel t.o.v. verwacht (laatste 5)</span>
            </div>
            <div>
              <span className="k">Seizoen</span>
              <span className={`num ${last.cumPoints >= last.cumExpected ? "up" : "down"}`}>{signed(last.cumPoints - last.cumExpected)}</span>
              <span className="meta">punten meer dan verwacht in totaal</span>
            </div>
            {start && start !== last && (
              <div>
                <span className="k">Begin seizoen</span>
                <span className={`num ${start.form >= 0 ? "up" : "down"}`}>{signed(start.form)}</span>
                <span className="meta">vorm na de eerste 5 duels</span>
              </div>
            )}
          </div>
        )}
        <FormChart points={form} />
      </Box>

      <Box
        label="Duo's"
        style={{ marginTop: 16 }}
        bodyClass={null}
        right={<InfoTip label="Wat is een duo?">Wie geeft de assist op wie: de combinaties die het vaakst samen een goal maakten.</InfoTip>}
      >
        {pairs.length ? (
          <div className="duos">
            {pairs.map((d, i) => {
              const a = byId(d.assistId);
              const s = byId(d.scorerId);
              return (
                <div key={`${d.assistId}>${d.scorerId}`} className="duo">
                  <span className="rank">{i + 1}</span>
                  <span className="duo-pair">
                    {a && <Shirt player={a} size={36} />}
                    <span className="duo-arrow" aria-hidden="true">
                      →
                    </span>
                    {s && <Shirt player={s} size={36} />}
                  </span>
                  <span className="duo-names">
                    <b>
                      {playerLabel(a)} → {playerLabel(s)}
                    </b>
                    <small>assist → goal</small>
                  </span>
                  <span className="num">{d.goals}×</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="box-b muted">Nog geen goals met assist ingevoerd.</div>
        )}
      </Box>
    </>
  );
}
