"use client";

import { useEffect, useState } from "react";
import { fmtDate } from "@/lib/format";
import type { Teaser } from "@/lib/store/teaser";

const RESULT = { W: "W", D: "G", L: "V" } as const;

/**
 * Openbare uitnodiging (zonder login): een paar cijfers die nieuwsgierig maken, en inloggen of toegang
 * aanvragen. Namen, spelerskaarten en statistieken zie je pas na het inloggen.
 */
export function Welcome() {
  const [t, setT] = useState<Teaser | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    fetch("/open/teaser")
      .then((r) => (r.ok ? (r.json() as Promise<Teaser>) : null))
      .then(setT)
      .catch(() => setT(null));
  }, []);

  return (
    <div className="stack welcome" style={{ maxWidth: 520, margin: "0 auto" }}>
      <section className="box">
        <div className="box-b">
          <p className="k">Alleen voor het team</p>
          <h1 className="welcome-h">Peursum 4</h1>
          <p className="meta">Stand, uitslagen, spelerskaarten, team van de maand en meer. Log in om alles te zien.</p>

          {t && (
            <>
              <div className="form-tiles welcome-tiles">
                <div>
                  <span className="num">{t.position ?? "–"}</span>
                  <span className="meta">plek van {t.teams || "–"}</span>
                </div>
                <div>
                  <span className="num">{t.points}</span>
                  <span className="meta">punten uit {t.played}</span>
                </div>
                <div>
                  <span className="num">{t.goals}</span>
                  <span className="meta">goals gemaakt</span>
                </div>
              </div>
              {t.form.length > 0 && (
                <p className="welcome-form" aria-label="Laatste uitslagen">
                  {t.form.map((r, i) => (
                    <span key={i} className={`tag ${r}`}>
                      {RESULT[r]}
                    </span>
                  ))}
                </p>
              )}
              {t.last && (
                <p className="meta">
                  Laatst: {t.last.home ? "thuis" : "uit"} tegen {t.last.opponent},{" "}
                  <b className={`score ${t.last.for > t.last.against ? "W" : t.last.for === t.last.against ? "D" : "L"}`}>
                    {t.last.for}–{t.last.against}
                  </b>
                </p>
              )}
              {t.next && (
                <p className="meta">
                  Volgende: {t.next.home ? "thuis" : "uit"} tegen {t.next.opponent}, {t.next.date ? fmtDate(t.next.date).full : "datum volgt"}
                  {t.next.time ? ` om ${t.next.time}` : ""}
                </p>
              )}
            </>
          )}
        </div>
      </section>

      <section className="box welcome-locked">
        <div className="box-b">
          <div className="welcome-cards" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <p className="lbl">Achter de login</p>
          <ul className="welcome-list">
            <li>Spelerskaarten van {t?.squad ? `alle ${t.squad}` : "alle"} spelers, die meegroeien met het seizoen</li>
            <li>{t?.topGoals ? `De topscorer staat op ${t.topGoals} goals. Wie het is?` : "Topscorers, assists en de nul"}</li>
            <li>Man van de wedstrijd, speler en team van de maand</li>
            <li>Winkans per wedstrijd en de stand door het seizoen</li>
          </ul>
          <div className="actions">
            <a className="btn primary" href="/api/login">
              Inloggen
            </a>
            {!asking && (
              <button className="btn" type="button" onClick={() => setAsking(true)}>
                Toegang aanvragen
              </button>
            )}
          </div>
          <p className="meta" style={{ marginTop: 8 }}>
            Inloggen gaat met een code die je per e-mail krijgt; je hebt geen wachtwoord nodig.
          </p>
        </div>
      </section>

      {asking && <RequestForm />}
    </div>
  );
}

function RequestForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/open/aanvraag", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-P4": "1" },
        body: JSON.stringify({ name, email, note, website }),
      });
      if (res.ok) {
        setMsg({ ok: true, text: "Aanvraag verstuurd. Zodra die is goedgekeurd, kun je inloggen met dit e-mailadres." });
        setName("");
        setNote("");
      } else {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setMsg({ ok: false, text: body?.error ?? "Versturen lukte niet. Probeer het later nog eens." });
      }
    } catch {
      setMsg({ ok: false, text: "Versturen lukte niet. Probeer het later nog eens." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="box">
      <div className="box-h">
        <p className="lbl">Toegang aanvragen</p>
      </div>
      <form className="box-b" onSubmit={submit}>
        <label className="f">
          Naam
          <input type="text" required maxLength={60} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="f">
          E-mailadres
          <input type="email" required maxLength={254} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="f">
          Wie ben je? (speler, trainer, familie…)
          <input type="text" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {/* Onzichtbaar veld tegen robots */}
        <input className="hp" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.target.value)} />
        <div className="actions">
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? "Versturen…" : "Versturen"}
          </button>
        </div>
        {msg && <p className={`note ${msg.ok ? "" : "warn"}`}>{msg.text}</p>}
        <p className="meta">Je naam en e-mailadres zijn alleen zichtbaar voor de beheerder.</p>
      </form>
    </section>
  );
}
