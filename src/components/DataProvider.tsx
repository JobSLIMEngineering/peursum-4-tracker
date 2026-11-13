"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import seed from "../../docs/seed-data.json";
import type { SeedData } from "@/lib/domain/seed";
import { initialData } from "@/lib/store/initial";
import { toPublic } from "@/lib/store/public";
import type { DataFile, DataFiles } from "@/lib/store/schema";
import { ApiStore, GitHubStore, LocalStore, probeApi, PublicStore, type Store } from "@/lib/store/store";
import { clearToken, getToken, isGuest, LOCAL_MODE, setGuest, setToken } from "@/lib/store/token";
import { buildView, type AppView } from "@/lib/store/view";
import { Login } from "./Login";
import { Welcome } from "./Welcome";

interface Ctx {
  store: Store;
  files: DataFiles;
  view: AppView;
  /** Gast of teamlid: alleen kijken, alle bewerkknoppen verborgen */
  readOnly: boolean;
  /** Ingelogd via de eigen server (Cloudflare): wie, en beheerder of lid */
  account: { email: string; role: "owner" | "member" } | null;
  /** Wijzigt een bestand: direct zichtbaar, daarna opgeslagen in de data-repository. */
  mutate<K extends DataFile>(file: K, fn: (cur: DataFiles[K]) => DataFiles[K], message: string): Promise<boolean>;
  reload(): Promise<void>;
  saving: boolean;
  error: string | null;
  logout(): void;
}

const DataContext = createContext<Ctx | null>(null);

export function useData(): Ctx {
  const c = useContext(DataContext);
  if (!c) throw new Error("useData buiten DataProvider");
  return c;
}

type Phase = { kind: "start" } | { kind: "welcome" } | { kind: "login"; error?: string } | { kind: "ready"; store: Store };

const PUBLISHED_KEY = "p4-published";

/**
 * Kijkversie voor gasten bijwerken als er iets veranderd is (alleen vanuit de eigenaar-login).
 * Fouten zijn niet erg: de volgende keer opnieuw.
 */
async function publishIfChanged(store: GitHubStore, files: DataFiles) {
  const json = JSON.stringify(toPublic(files));
  let last: string | null = null;
  try {
    last = localStorage.getItem(PUBLISHED_KEY);
  } catch {
    // geen opslag: gewoon publiceren
  }
  if (last === json) return;
  try {
    await store.publishPublic(json);
    try {
      localStorage.setItem(PUBLISHED_KEY, json);
    } catch {
      // negeren
    }
  } catch (e) {
    console.warn("Kijkversie niet bijgewerkt", e);
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>({ kind: "start" });
  const [files, setFiles] = useState<DataFiles | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = useCallback(async (store: Store) => {
    try {
      setFiles(await store.readAll());
      setPhase({ kind: "ready", store });
    } catch (e) {
      if (store.kind === "public") setGuest(false);
      setPhase({ kind: "login", error: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  useEffect(() => {
    // Na het eerste renderen: localStorage bestaat alleen in de browser
    queueMicrotask(async () => {
      if (LOCAL_MODE) return void open(new LocalStore(initialData(seed as SeedData)));
      // Eigen server (Cloudflare)? Dan inloggen met e-mail; zonder login de openbare uitnodiging
      const api = await probeApi();
      if (api.kind === "in") return void open(new ApiStore(api.email, api.role));
      if (api.kind === "out") return setPhase({ kind: "welcome" });
      // Anders (GitHub Pages): zoals voorheen met de sleutel of als gast
      const token = getToken();
      // Deellink (…/?gast): direct als gast kijken, tenzij je op dit apparaat al bent ingelogd
      const params = new URLSearchParams(window.location.search);
      if (params.has("gast")) {
        if (!token) setGuest(true);
        params.delete("gast");
        const rest = params.toString();
        window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : "") + window.location.hash);
      }
      if (token) void open(new GitHubStore(token));
      else if (isGuest()) void open(new PublicStore());
      else setPhase({ kind: "login" });
    });
  }, [open]);

  // Eigenaar: kijkversie bijwerken (even wachten, zodat meerdere wijzigingen samen gaan)
  useEffect(() => {
    if (phase.kind !== "ready" || !(phase.store instanceof GitHubStore) || !files) return;
    const store = phase.store;
    if (publishTimer.current) clearTimeout(publishTimer.current);
    publishTimer.current = setTimeout(() => void publishIfChanged(store, files), 3000);
    return () => {
      if (publishTimer.current) clearTimeout(publishTimer.current);
    };
  }, [phase, files]);

  const login = useCallback(
    async (token: string) => {
      const store = new GitHubStore(token);
      await store.check();
      setToken(token);
      setGuest(false);
      await open(store);
    },
    [open],
  );

  const guest = useCallback(async () => {
    setGuest(true);
    await open(new PublicStore());
  }, [open]);

  const ctx = useMemo<Ctx | null>(() => {
    if (phase.kind !== "ready" || !files) return null;
    const store = phase.store;
    const account = store instanceof ApiStore ? { email: store.email, role: store.role } : null;
    const readOnly = store.kind === "public" || account?.role === "member";
    return {
      store,
      files,
      view: buildView(files),
      readOnly,
      account,
      saving,
      error,
      async mutate(file, fn, message) {
        if (readOnly) return false;
        setFiles((cur) => (cur ? { ...cur, [file]: fn(structuredClone(cur[file])) } : cur));
        setSaving(true);
        setError(null);
        try {
          const saved = await store.update(file, fn, message);
          setFiles((cur) => (cur ? { ...cur, [file]: saved } : cur));
          return true;
        } catch (e) {
          setError(e instanceof Error ? e.message : "Opslaan mislukt.");
          setFiles(await store.readAll().catch(() => files));
          return false;
        } finally {
          setSaving(false);
        }
      },
      async reload() {
        setFiles(await store.readAll());
      },
      logout() {
        // Eigen server: uitloggen bij Cloudflare Access
        // (geen pagina van de app maar het uitlogadres van Cloudflare, dus echt de pagina verlaten)
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        if (account) return void (window.location.href = "/cdn-cgi/access/logout");
        clearToken();
        setGuest(false);
        setFiles(null);
        setPhase({ kind: "login" });
      },
    };
  }, [phase, files, saving, error]);

  // Automatisch verversen (nieuwe uitslagen, stand, nieuws): elke 5 minuten en als de app weer in beeld komt
  useEffect(() => {
    if (phase.kind !== "ready") return;
    const store = phase.store;
    let last = Date.now();
    const refresh = () => {
      if (document.hidden || saving || Date.now() - last < 60_000) return;
      last = Date.now();
      store
        .readAll()
        .then((f) => setFiles((cur) => (JSON.stringify(cur) === JSON.stringify(f) ? cur : f)))
        .catch(() => {
          // volgende keer opnieuw
        });
    };
    const t = setInterval(refresh, 5 * 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [phase, saving]);

  if (phase.kind === "start") return <p className="meta">Laden…</p>;
  if (phase.kind === "welcome") return <Welcome />;
  if (phase.kind === "login") return <Login onLogin={login} onGuest={guest} error={phase.error} />;
  if (!ctx) return null;
  return <DataContext.Provider value={ctx}>{children}</DataContext.Provider>;
}
