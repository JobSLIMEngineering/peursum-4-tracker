/**
 * Lezen en schrijven in de privé data-repository, vanaf de server. De GitHub-sleutel staat alleen hier
 * (als geheime instelling in Cloudflare), nooit in de browser.
 */

export interface Repo {
  owner: string;
  repo: string;
  dir: string;
}

export const DEFAULT_DATA_REPO: Repo = { owner: "JobSLIMEngineering", repo: "peursum-4-data", dir: "data" };

/** "eigenaar/repo" uit een instelling, anders de standaard */
export const repoFrom = (s: string | undefined): Repo => {
  const [owner, repo] = (s ?? "").split("/");
  return owner && repo ? { owner, repo, dir: "data" } : DEFAULT_DATA_REPO;
};

const API = "https://api.github.com";

export const b64decode = (b64: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), (c) => c.charCodeAt(0)));

export const b64encode = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

export class Conflict extends Error {}

export class GitHub {
  constructor(
    private readonly token: string,
    readonly repo: Repo = DEFAULT_DATA_REPO,
    private readonly fetchFn: typeof fetch = (...a) => fetch(...a),
  ) {}

  private api(path: string, init: RequestInit = {}) {
    return this.fetchFn(`${API}${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        // GitHub weigert aanvragen zonder User-Agent
        "User-Agent": "peursum-4-app",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
    });
  }

  private path(file: string) {
    const { owner, repo, dir } = this.repo;
    return `/repos/${owner}/${repo}/contents/${dir}/${file}`;
  }

  /** Bestand lezen; null als het (nog) niet bestaat */
  async read<T>(file: string): Promise<{ data: T; sha: string } | null> {
    const res = await this.api(this.path(file));
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Lezen van ${file} mislukt (${res.status})`);
    const body = (await res.json()) as { content: string; sha: string };
    return { data: JSON.parse(b64decode(body.content)) as T, sha: body.sha };
  }

  /** Bestand schrijven. Met `sha` alleen als niemand het intussen veranderde (anders Conflict). */
  async write(file: string, data: unknown, message: string, sha: string | null): Promise<string> {
    const res = await this.api(this.path(file), {
      method: "PUT",
      body: JSON.stringify({
        message,
        content: b64encode(JSON.stringify(data, null, 2) + "\n"),
        ...(sha ? { sha } : {}),
      }),
    });
    if (res.status === 409 || res.status === 422) throw new Conflict(`${file} is intussen gewijzigd`);
    if (!res.ok) throw new Error(`Opslaan van ${file} mislukt (${res.status})`);
    return ((await res.json()) as { content: { sha: string } }).content.sha;
  }

  /** Lezen, aanpassen en terugschrijven; bij een botsing opnieuw */
  async update<T>(file: string, empty: T, fn: (cur: T) => T, message: string): Promise<T> {
    for (let i = 0; i < 4; i++) {
      const cur = await this.read<T>(file);
      const next = fn(cur ? cur.data : structuredClone(empty));
      try {
        await this.write(file, next, message, cur?.sha ?? null);
        return next;
      } catch (e) {
        if (!(e instanceof Conflict)) throw e;
      }
    }
    throw new Conflict(`${file} werd steeds tegelijk gewijzigd`);
  }

  /** De ophaal-Action starten ("Nu verversen") */
  async dispatch(workflow: string): Promise<void> {
    const { owner, repo } = this.repo;
    const res = await this.api(`/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`, {
      method: "POST",
      body: JSON.stringify({ ref: "main", inputs: { force: "true" } }),
    });
    if (!res.ok) throw new Error(`Verversen starten mislukt (${res.status})`);
  }
}
