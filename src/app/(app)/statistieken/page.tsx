"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useData } from "@/components/DataProvider";
import { SeasonChart } from "@/components/SeasonChart";
import { InfoTip } from "@/components/InfoTip";
import { Shirt } from "@/components/Shirt";
import { PotmPack } from "@/components/PotmPack";
import { TeamOfMonth } from "@/components/TeamOfMonth";
import { Box } from "@/components/ui";
import { duos, seasonForm } from "@/lib/domain/insights";
import { seasonRatings } from "@/lib/domain/rating";
import { MON_FULL } from "@/lib/format";
import type { StoredPlayer } from "@/lib/store/schema";
import { playerLabel, splitName } from "@/lib/domain/types";

const comma = (x: number, d = 1) => x.toFixed(d).replace(".", ",");
const signed = (x: number, d = 1) => (x >= 0 ? "+" : "−") + comma(Math.abs(x), d);
const monthName = (ym: string) => MON_FULL[Number(ym.slice(5, 7)) - 1];
/** Voornaam + eerste letter achternaam, zodat duo's op een telefoon leesbaar blijven */
const short = (p: StoredPlayer | undefined) => {
  if (!p?.name) return playerLabel(p);
  const n = splitName(p.name, 9);
  return n.first ? `${n.first} ${n.last}` : n.last;
};

/** Statistieken: vorm door het seizoen (gecorrigeerd voor de tegenstanders) en de duo's */
export default function StatistiekenPage() {
  const { view, readOnly } = useData();
  const form = useMemo(() => seasonForm(view.model, view.matches, view.pool), [view]);
  const pairs = useMemo(() => duos(view.matches, view.entries).slice(0, 6), [view]);
  // Spelersklassement: alleen wie er iets bij heeft (geen minnen in beeld), top 10
  const ranking = useMemo(() => seasonRatings(view.rows, view.players).filter((r) => r.total > 0).slice(0, 10), [view]);
  const months = view.potms;
  const potm = months.at(-1);
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
        <SeasonChart points={form} entries={view.entries} showInjuries={!readOnly} />
      </Box>

      {potm && (
        <section className="box potm" style={{ marginTop: 16 }}>
          <div className="box-h">
            <p className="lbl">Speler van de maand</p>
            <InfoTip label="Hoe wordt dit bepaald?">
              Elke wedstrijd krijgt iedereen die meedeed spelerspunten: erbij als het beter gaat dan het model verwachtte
              tegen deze tegenstander, eraf als het slechter gaat. Verdedigers en de keeper vooral op tegengoals, aanvallers
              op gemaakte goals, plus goals (+3), assists (+2), de nul als keeper (+1) en kaarten (−1/−3). Zo maakt iedereen
              kans, van keeper tot spits. Wie in een maand maar één duel speelde, telt niet mee.
            </InfoTip>
          </div>
          <div className="potm-open">
            <PotmPack />
          </div>
          {months.length > 1 && (
            <div className="potm-prev">
              {months
                .slice(0, -1)
                .reverse()
                .map((m) => (
                  <span key={m.month}>
                    <span className="k">{monthName(m.month)}</span> {playerLabel(byId(m.playerId))}
                  </span>
                ))}
            </div>
          )}
        </section>
      )}

      <TeamOfMonth />

      {ranking.length > 0 && (
        <Box
          label="Spelersklassement"
          style={{ marginTop: 16 }}
          bodyClass={null}
          right={
            <>
              <span className="meta">punten · per duel</span>
              <InfoTip label="Hoe komen de punten tot stand?">
                Per wedstrijd weet het model hoeveel goals we tegen deze tegenstander zouden maken en krijgen. Wie meedoet krijgt:
                <br />• <b>verdedigen</b>: elke goal minder tegen dan verwacht levert de keeper 2,5, een verdediger 1,5, een
                middenvelder 0,4 punt op (meer tegen kost evenveel);
                <br />• <b>aanvallen</b>: elke goal meer dan verwacht levert een aanvaller 0,8, een middenvelder 0,4 punt op;
                <br />• <b>team</b>: 0,5 × (punten − verwachte punten);
                <br />• <b>zelf</b>: goal +3, assist +2, de nul als keeper +1, geel −1, rood −3, eigen goal −2.
                <br />Wie een deel speelde of tijdelijk ergens anders stond, krijgt dat deel. Zo telt een sterke verdediging
                net zo zwaar als een productieve aanval: samen is één goal tegengehouden ongeveer evenveel waard als één
                goal gemaakt.
              </InfoTip>
            </>
          }
        >
          <div className="ranking">
            {ranking.map((r, i) => {
              const p = byId(r.playerId);
              return (
                <div key={r.playerId} className="rank-row">
                  <span className="rank">{i + 1}</span>
                  {p && <Shirt player={p} size={32} />}
                  <span className="who">
                    <b>{playerLabel(p)}</b>
                    <small>
                      {r.games} duels
                      {r.motm ? ` · ${r.motm}× man van de wedstrijd` : ""}
                    </small>
                  </span>
                  <span className="num">
                    {comma(r.total)}
                    <small>{comma(r.perGame)}</small>
                  </span>
                </div>
              );
            })}
          </div>
        </Box>
      )}

      <Box
        label="Duo's"
        style={{ marginTop: 16 }}
        bodyClass={null}
        right={<InfoTip label="Wat is een duo?">Wie geeft de assist op wie: de combinaties die het vaakst samen een goal maakten.</InfoTip>}
      >
        {pairs.length ? (
          <div className="duos">
            {pairs.map((d) => {
              const a = byId(d.assistId);
              const sc = byId(d.scorerId);
              return (
                <div key={`${d.assistId}>${d.scorerId}`} className="duo">
                  <span className="duo-p">
                    {a && <Shirt player={a} size={44} />}
                    <span>{short(a)}</span>
                    <small>assist</small>
                  </span>
                  <span className="duo-mid">
                    <span className="num">{d.goals}×</span>
                    <span className="duo-arrow" aria-hidden="true">
                      ⟶
                    </span>
                  </span>
                  <span className="duo-p">
                    {sc && <Shirt player={sc} size={44} />}
                    <span>{short(sc)}</span>
                    <small>goal</small>
                  </span>
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
