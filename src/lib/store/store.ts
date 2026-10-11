import { DATA_FILES, EMPTY, type DataFile, type DataFiles } from "./schema";

export const DATA_REPO = { owner: "JobSLIMEngineering", repo: "peursum-4-data", dir: "data" };
/** Openbare app-repository; hierin staat de versleutelde sleutel (public/toegang.json) */
export const APP_REPO = { owner: "JobSLIMEngineering", repo: "peursum-4-tracker", vault: "public/toegang.json" };
export const SYNC_WORKFLOW = "sync.yml";

export interface Store {
  readonly kind: "github" | "local";
  readAll(): Promise<DataFiles>;
  /** Leest het bestand vers, past `fn` toe en schrijft terug. Bij een botsing opnieuw. */
  update<K extends DataFile>(file: K, fn: (cur: DataFiles[K]) => DataFiles[K], message: string): Promise<DataFiles[K]>;
  /** Start de ophaal-Action ("Nu verversen") */
  triggerSync(): Promise<void>;
}

export class StoreError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "StoreError";
  }
}

// ---------------------------------------------------------------------------
// GitHub: Contents API op de privé data-repository
// ---------------------------------------------------------------------------

const API = "https://api.github.com";

const b64decode = (b64: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), (c) => c.charCodeAt(0)));

const b64encode = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

export class GitHubStore implements Store {
  readonly kind = "github" as const;

  constructor(
    private readonly token: string,
    private readonly fetchFn: typeof fetch = (...a) => fetch(...a),
  ) {}

  private async api(path: string, init: RequestInit = {}) {
    const res = await this.fetchFn(`${API}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    return res;
  }

  private filePath(file: DataFile) {
    const { owner, repo, dir } = DATA_REPO;
    return `/repos/${owner}/${repo}/contents/${dir}/${file}`;
  }

  /** Controleert of de sleutel bij de data-repository kan (en desgewenst in de app-repository mag schrijven). */
  async check(opts: { appWrite?: boolean } = {}): Promise<void> {
    const repos = [DATA_REPO, ...(opts.appWrite ? [APP_REPO] : [])];
    for (const { owner, repo } of repos) {
      const res = await this.api(`/repos/${owner}/${repo}`);
      if (res.status === 401) throw new StoreError("Deze sleutel is ongeldig of verlopen.", 401);
      if (res.status === 404) throw new StoreError(`Geen toegang tot ${owner}/${repo} met deze sleutel.`, 404);
      if (!res.ok) throw new StoreError(`GitHub gaf een fout (${res.status}).`, res.status);
      const body = (await res.json()) as { permissions?: { push?: boolean } };
      if (body.permissions && !body.permissions.push) {
        throw new StoreError(`Deze sleutel mag niet schrijven in ${owner}/${repo} (Contents: Read and write).`);
      }
    }
  }

  /** Slaat de versleutelde sleutel op in de app-repository; GitHub Pages publiceert hem binnen een paar minuten. */
  async saveVault(vault: object): Promise<void> {
    const { owner, repo, vault: path } = APP_REPO;
    const url = `/repos/${owner}/${repo}/contents/${path}`;
    const cur = await this.api(url);
    const sha = cur.ok ? ((await cur.json()) as { sha: string }).sha : undefined;
    const res = await this.api(url, {
      method: "PUT",
      body: JSON.stringify({
        message: "app: nieuw wachtwoord ingesteld",
        content: b64encode(JSON.stringify(vault, null, 2) + "\n"),
        ...(sha ? { sha } : {}),
      }),
    });
    if (!res.ok) throw new StoreError(`Wachtwoord opslaan mislukt (${res.status}).`, res.status);
  }

  async read<K extends DataFile>(file: K): Promise<{ data: DataFiles[K]; sha: string | null }> {
    const res = await this.api(this.filePath(file));
    if (res.status === 404) return { data: structuredClone(EMPTY[file]), sha: null };
    if (!res.ok) throw new StoreError(`Lezen van ${file} mislukt (${res.status}).`, res.status);
    const body = (await res.json()) as { content: string; sha: string };
    return { data: JSON.parse(b64decode(body.content)) as DataFiles[K], sha: body.sha };
  }

  async readAll(): Promise<DataFiles> {
    const entries = await Promise.all(DATA_FILES.map(async (f) => [f, (await this.read(f)).data] as const));
    return Object.fromEntries(entries) as unknown as DataFiles;
  }

  async update<K extends DataFile>(
    file: K,
    fn: (cur: DataFiles[K]) => DataFiles[K],
    message: string,
  ): Promise<DataFiles[K]> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data, sha } = await this.read(file);
      const next = fn(structuredClone(data));
      const res = await this.api(this.filePath(file), {
        method: "PUT",
        body: JSON.stringify({
          message: `app: ${message}`,
          content: b64encode(JSON.stringify(next, null, 2) + "\n"),
          ...(sha ? { sha } : {}),
        }),
      });
      if (res.ok) return next;
      // 409/422: het bestand is intussen gewijzigd (bijv. door de scraper) → opnieuw
      if (res.status !== 409 && res.status !== 422) {
        throw new StoreError(`Opslaan van ${file} mislukt (${res.status}).`, res.status);
      }
    }
    throw new StoreError(`Opslaan van ${file} mislukt: het bestand werd steeds tegelijk gewijzigd.`);
  }

  async triggerSync(): Promise<void> {
    const { owner, repo } = DATA_REPO;
    const res = await this.api(`/repos/${owner}/${repo}/actions/workflows/${SYNC_WORKFLOW}/dispatches`, {
      method: "POST",
      body: JSON.stringify({ ref: "main", inputs: { force: "true" } }),
    });
    if (!res.ok) throw new StoreError(`Verversen starten mislukt (${res.status}).`, res.status);
  }
}

// ---------------------------------------------------------------------------
// Lokaal: alleen voor ontwikkelen zonder sleutel (npm run dev). Data in localStorage.
// ---------------------------------------------------------------------------

const LOCAL_KEY = "p4-local-data";

export class LocalStore implements Store {
  readonly kind = "local" as const;

  constructor(private readonly initial: DataFiles) {}

  private load(): DataFiles {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) return { ...structuredClone(this.initial), ...JSON.parse(raw) };
    } catch {
      // geen opslag beschikbaar: beginstand gebruiken
    }
    return structuredClone(this.initial);
  }

  async readAll() {
    return this.load();
  }

  async update<K extends DataFile>(file: K, fn: (cur: DataFiles[K]) => DataFiles[K]) {
    const all = this.load();
    const next = fn(structuredClone(all[file]));
    all[file] = next;
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
    } catch {
      // negeren: lokale modus
    }
    return next;
  }

  async triggerSync() {
    throw new StoreError("Verversen werkt alleen in de online app.");
  }

  static reset() {
    try {
      localStorage.removeItem(LOCAL_KEY);
    } catch {
      // negeren
    }
  }
}
