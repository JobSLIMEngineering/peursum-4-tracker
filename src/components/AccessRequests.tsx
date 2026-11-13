"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccessRequest } from "@/lib/store/requests";
import { useData } from "./DataProvider";

/** Toegangsaanvragen van de openbare uitnodiging (alleen de beheerder, alleen op de eigen server) */
export function AccessRequests() {
  const { account } = useData();
  const [list, setList] = useState<AccessRequest[] | null>(null);
  const [autoAdd, setAutoAdd] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const isOwner = account?.role === "owner";

  const load = useCallback(async () => {
    const res = await fetch("/api/aanvragen", { cache: "no-store", headers: { "X-P4": "1" } });
    if (!res.ok) return;
    const body = (await res.json()) as { requests: AccessRequest[]; autoAdd: boolean };
    setList(body.requests);
    setAutoAdd(body.autoAdd);
  }, []);

  useEffect(() => {
    if (isOwner) queueMicrotask(() => void load());
  }, [isOwner, load]);

  if (!isOwner || !list) return null;
  const open = list.filter((r) => r.status === "open");
  if (!open.length && !msg) return null;

  async function act(r: AccessRequest, action: "goedkeuren" | "afwijzen") {
    setBusy(r.id);
    setMsg(null);
    const res = await fetch("/api/aanvragen", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-P4": "1" },
      body: JSON.stringify({ id: r.id, action }),
    });
    const body = (await res.json().catch(() => null)) as { added?: string; error?: string } | null;
    setBusy(null);
    if (!res.ok) return setMsg(body?.error ?? "Dat lukte niet.");
    if (action === "afwijzen") setMsg(`${r.name} afgewezen.`);
    else if (body?.added === "manual") setMsg(`${r.name} goedgekeurd. Zet ${r.email} nog zelf in de Access-groep in Cloudflare.`);
    else setMsg(`${r.name} kan nu inloggen met ${r.email}.`);
    await load();
  }

  return (
    <section className="box" style={{ marginBottom: 16 }}>
      <div className="box-h">
        <p className="lbl">Toegangsaanvragen</p>
        <span className="meta">{open.length} open</span>
      </div>
      <div className="box-b">
        <div className="req-list">
          {open.map((r) => (
            <div key={r.id} className="req">
              <b>{r.name}</b>
              <span className="meta">
                {r.email}
                {r.note && ` · ${r.note}`}
              </span>
              <div className="actions">
                <button className="btn sm primary" type="button" disabled={busy === r.id} onClick={() => void act(r, "goedkeuren")}>
                  Goedkeuren
                </button>
                <button className="btn sm" type="button" disabled={busy === r.id} onClick={() => void act(r, "afwijzen")}>
                  Afwijzen
                </button>
              </div>
            </div>
          ))}
        </div>
        {msg && <p className="note">{msg}</p>}
        {!autoAdd && open.length > 0 && (
          <p className="meta" style={{ marginTop: 8 }}>
            Goedkeuren zet het adres nog niet vanzelf in Cloudflare; daarvoor is een Cloudflare-sleutel nodig (zie de handleiding).
          </p>
        )}
      </div>
    </section>
  );
}
