"use client";

import { useState } from "react";
import { DATA_REPO } from "@/lib/store/store";

const TOKEN_URL =
  "https://github.com/settings/personal-access-tokens/new?name=Peursum%204%20app&description=Toegang%20tot%20peursum-4-data&expires_in=366&contents=write&actions=write";

/** "Inloggen": eenmalig per apparaat een GitHub-sleutel plakken die alleen bij de data-repository kan. */
export function Login({ onLogin, error }: { onLogin: (token: string) => Promise<void>; error?: string }) {
  const [token, setTokenValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | undefined>(error);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(undefined);
    try {
      await onLogin(token.trim());
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Inloggen mislukt.");
      setBusy(false);
    }
  }

  return (
    <section className="box" style={{ maxWidth: 520, margin: "0 auto" }}>
      <div className="box-h">
        <p className="lbl">Inloggen</p>
      </div>
      <form className="box-b" onSubmit={submit}>
        <p style={{ marginTop: 0 }}>
          De gegevens staan in je privé repository <b>{DATA_REPO.owner}/{DATA_REPO.repo}</b>. Plak hier één keer
          per apparaat je GitHub-sleutel.
        </p>
        <ol className="meta steps" style={{ lineHeight: 1.6 }}>
          <li>
            Open{" "}
            <a href={TOKEN_URL} target="_blank" rel="noreferrer" style={{ color: "#fff" }}>
              een nieuwe sleutel op GitHub
            </a>
            .
          </li>
          <li>
            Bij <i>Repository access</i>: kies <i>Only select repositories</i> → <b>{DATA_REPO.repo}</b>.
          </li>
          <li>
            Controleer bij <i>Permissions</i>: <b>Contents</b> en <b>Actions</b> op <i>Read and write</i>.
          </li>
          <li>
            <i>Generate token</i>, kopieer hem en plak hem hieronder.
          </li>
        </ol>
        <label className="f">
          GitHub-sleutel
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setTokenValue(e.target.value)}
            placeholder="github_pat_…"
            required
            style={{ fontFamily: "monospace" }}
          />
        </label>
        <div className="actions">
          <button className="btn primary" type="submit" disabled={busy || !token.trim()}>
            {busy ? "Controleren…" : "Inloggen"}
          </button>
        </div>
        {msg && <p className="note warn">{msg}</p>}
        <p className="meta" style={{ marginBottom: 0 }}>
          De sleutel blijft alleen op dit apparaat. Kwijt of gestolen? Trek hem in op GitHub onder Settings →
          Developer settings → Personal access tokens.
        </p>
      </form>
    </section>
  );
}
