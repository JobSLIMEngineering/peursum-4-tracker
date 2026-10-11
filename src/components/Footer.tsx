"use client";

import { useState } from "react";
import { useData } from "./DataProvider";

const fmt = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("nl-NL", {
        timeZone: "Europe/Amsterdam",
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso))
    : "nog niet";

/** Onderaan: laatste ophaalrun, Nu verversen en uitloggen */
export function Footer() {
  const { files, store, reload, logout } = useData();
  const sync = files["sync.json"];
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    setMsg("Ophalen gestart…");
    try {
      await store.triggerSync();
      // De Action heeft ongeveer een minuut nodig; daarna de data opnieuw lezen
      setMsg("Ophalen gestart. Over ongeveer een minuut ververst de app.");
      setTimeout(async () => {
        await reload();
        setMsg("Bijgewerkt.");
        setBusy(false);
      }, 75_000);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Verversen mislukt.");
      setBusy(false);
    }
  }

  return (
    <footer className="foot">
      <div>
        Clubsite laatst opgehaald: {fmt(sync.lastRun)}
        {sync.unsure.length > 0 && <> · onzeker: {sync.unsure.join(", ")}</>}
      </div>
      <div className="actions" style={{ marginTop: 6 }}>
        <button className="link" type="button" onClick={refresh} disabled={busy}>
          Nu verversen
        </button>
        {store.kind === "github" && (
          <button className="link" type="button" onClick={logout}>
            Uitloggen op dit apparaat
          </button>
        )}
      </div>
      {msg && <div style={{ marginTop: 4 }}>{msg}</div>}
    </footer>
  );
}
