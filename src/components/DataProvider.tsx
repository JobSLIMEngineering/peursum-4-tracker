"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import seed from "../../docs/seed-data.json";
import type { SeedData } from "@/lib/domain/seed";
import { initialData } from "@/lib/store/initial";
import type { DataFile, DataFiles } from "@/lib/store/schema";
import { GitHubStore, LocalStore, type Store } from "@/lib/store/store";
import { clearToken, getToken, LOCAL_MODE, setToken } from "@/lib/store/token";
import { buildView, type AppView } from "@/lib/store/view";
import { Login } from "./Login";

interface Ctx {
  store: Store;
  files: DataFiles;
  view: AppView;
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

type Phase = { kind: "start" } | { kind: "login"; error?: string } | { kind: "ready"; store: Store };

export function DataProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>({ kind: "start" });
  const [files, setFiles] = useState<DataFiles | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(async (store: Store) => {
    try {
      setFiles(await store.readAll());
      setPhase({ kind: "ready", store });
    } catch (e) {
      setPhase({ kind: "login", error: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  useEffect(() => {
    // Na het eerste renderen: localStorage bestaat alleen in de browser
    queueMicrotask(() => {
      if (LOCAL_MODE) return void open(new LocalStore(initialData(seed as SeedData)));
      const token = getToken();
      if (token) void open(new GitHubStore(token));
      else setPhase({ kind: "login" });
    });
  }, [open]);

  const login = useCallback(
    async (token: string) => {
      const store = new GitHubStore(token);
      await store.check();
      setToken(token);
      await open(store);
    },
    [open],
  );

  const ctx = useMemo<Ctx | null>(() => {
    if (phase.kind !== "ready" || !files) return null;
    const store = phase.store;
    return {
      store,
      files,
      view: buildView(files),
      saving,
      error,
      async mutate(file, fn, message) {
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
        clearToken();
        setFiles(null);
        setPhase({ kind: "login" });
      },
    };
  }, [phase, files, saving, error]);

  if (phase.kind === "start") return <p className="meta">Laden…</p>;
  if (phase.kind === "login") return <Login onLogin={login} error={phase.error} />;
  if (!ctx) return null;
  return <DataContext.Provider value={ctx}>{children}</DataContext.Provider>;
}
