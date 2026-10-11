"use client";

import { useEffect, useState } from "react";
import { BASE } from "@/lib/base";
import { APP_REPO, DATA_REPO, GitHubStore } from "@/lib/store/store";
import { lock, MIN_PASSWORD, unlock, type Vault } from "@/lib/store/vault";

const TOKEN_URL =
  "https://github.com/settings/personal-access-tokens/new?name=Peursum%204%20app&description=Toegang%20Peursum%204%20Tracker&expires_in=366&contents=write&actions=write";

/** Versleutelde sleutel ophalen; eerst van de eigen site, anders rechtstreeks uit de (openbare) repository. */
async function fetchVault(): Promise<Vault | null> {
  const urls = [
    `${BASE}/toegang.json`,
    `https://raw.githubusercontent.com/${APP_REPO.owner}/${APP_REPO.repo}/main/${APP_REPO.vault}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return (await res.json()) as Vault;
    } catch {
      // volgende proberen
    }
  }
  return null;
}

/** Inloggen met wachtwoord. Eerste keer of vergeten: nieuwe GitHub-sleutel + nieuw wachtwoord. */
export function Login({ onLogin, error }: { onLogin: (token: string) => Promise<void>; error?: string }) {
  const [vault, setVault] = useState<Vault | null | undefined>(undefined);
  const [mode, setMode] = useState<"password" | "setup">("password");
  const [msg, setMsg] = useState<string | undefined>(error);

  useEffect(() => {
    void fetchVault().then((v) => {
      setVault(v);
      if (!v) setMode("setup");
    });
  }, []);

  if (vault === undefined) return <p className="meta">Laden…</p>;

  return (
    <section className="box" style={{ maxWidth: 520, margin: "0 auto" }}>
      <div className="box-h">
        <p className="lbl">{mode === "password" ? "Inloggen" : "Wachtwoord instellen"}</p>
      </div>
      {mode === "password" && vault ? (
        <PasswordForm vault={vault} onLogin={onLogin} msg={msg} setMsg={setMsg} onForgot={() => setMode("setup")} />
      ) : (
        <SetupForm
          onLogin={onLogin}
          msg={msg}
          setMsg={setMsg}
          onCancel={vault ? () => setMode("password") : undefined}
        />
      )}
    </section>
  );
}

function PasswordForm({
  vault,
  onLogin,
  msg,
  setMsg,
  onForgot,
}: {
  vault: Vault;
  onLogin: (token: string) => Promise<void>;
  msg?: string;
  setMsg: (m?: string) => void;
  onForgot: () => void;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(undefined);
    const token = await unlock(vault, password);
    if (!token) {
      setMsg("Wachtwoord klopt niet.");
      setBusy(false);
      return;
    }
    try {
      await onLogin(token);
    } catch (err) {
      setMsg(
        `${err instanceof Error ? err.message : "Inloggen mislukt."} Is de GitHub-sleutel verlopen? Stel dan een nieuw wachtwoord in.`,
      );
      setBusy(false);
    }
  }

  return (
    <form className="box-b" onSubmit={submit}>
      <input type="text" name="username" autoComplete="username" value="Peursum 4" readOnly hidden />
      <label className="f">
        Wachtwoord
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
        />
      </label>
      <div className="actions">
        <button className="btn primary" type="submit" disabled={busy || !password}>
          {busy ? "Controleren…" : "Inloggen"}
        </button>
        <button className="link" type="button" onClick={onForgot}>
          Wachtwoord vergeten of nieuw instellen
        </button>
      </div>
      {msg && <p className="note warn">{msg}</p>}
    </form>
  );
}

function SetupForm({
  onLogin,
  msg,
  setMsg,
  onCancel,
}: {
  onLogin: (token: string) => Promise<void>;
  msg?: string;
  setMsg: (m?: string) => void;
  onCancel?: () => void;
}) {
  const [token, setToken] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(undefined);
    if (pw.length < MIN_PASSWORD) return setMsg(`Kies een wachtwoord van minstens ${MIN_PASSWORD} tekens.`);
    if (pw !== pw2) return setMsg("De twee wachtwoorden zijn niet gelijk.");
    setBusy(true);
    try {
      const store = new GitHubStore(token.trim());
      await store.check({ appWrite: true });
      await store.saveVault(await lock(token.trim(), pw));
      setDone(true);
      await onLogin(token.trim());
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Instellen mislukt.");
      setBusy(false);
    }
  }

  return (
    <form className="box-b" onSubmit={submit}>
      <p style={{ marginTop: 0 }}>
        Eerste keer, of wachtwoord vergeten? Maak een nieuwe GitHub-sleutel en kies een wachtwoord. Daarna log je op
        elk apparaat in met alleen dat wachtwoord.
      </p>
      <ol className="meta steps" style={{ lineHeight: 1.6 }}>
        <li>
          Open{" "}
          <a href={TOKEN_URL} target="_blank" rel="noreferrer" style={{ color: "#fff" }}>
            een nieuwe sleutel op GitHub
          </a>{" "}
          (vergeten wachtwoord van GitHub zelf? Dat herstel je daar via je e-mail).
        </li>
        <li>
          Bij <i>Repository access</i>: <i>Only select repositories</i> → <b>{DATA_REPO.repo}</b> én{" "}
          <b>{APP_REPO.repo}</b>.
        </li>
        <li>
          Bij <i>Permissions</i>: <b>Contents</b> en <b>Actions</b> op <i>Read and write</i>.
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
          onChange={(e) => setToken(e.target.value)}
          placeholder="github_pat_…"
          required
          style={{ fontFamily: "monospace" }}
        />
      </label>
      <input type="text" name="username" autoComplete="username" value="Peursum 4" readOnly hidden />
      <label className="f" style={{ marginTop: 10 }}>
        Nieuw wachtwoord (minstens {MIN_PASSWORD} tekens)
        <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
      </label>
      <label className="f" style={{ marginTop: 10 }}>
        Nog een keer
        <input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
      </label>
      <div className="actions">
        <button className="btn primary" type="submit" disabled={busy || !token.trim() || !pw}>
          {busy ? "Opslaan…" : "Opslaan en inloggen"}
        </button>
        {onCancel && (
          <button className="btn" type="button" onClick={onCancel}>
            Terug
          </button>
        )}
      </div>
      {done && (
        <p className="note ok">
          Wachtwoord opgeslagen. Op andere apparaten werkt het nieuwe wachtwoord over een paar minuten.
        </p>
      )}
      {msg && <p className="note warn">{msg}</p>}
      <p className="meta" style={{ marginBottom: 0 }}>
        Online staat alleen een versleutelde versie van de sleutel. Zonder je wachtwoord is die niet te gebruiken.
      </p>
    </form>
  );
}
