import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { onRequestGet as getData } from "../../../functions/api/data";
import { onRequestPut as putFile } from "../../../functions/api/file";
import { onRequestPost as postRequest } from "../../../functions/open/aanvraag";
import { DATA_FILES, EMPTY } from "../store/schema";
import { addRequest, cleanRequest, MAX_OPEN } from "../store/requests";
import { _resetCertCache, roleOf, verifyAccessJwt } from "./access";
import { b64encode } from "./github";
import type { Env } from "./http";

/* ---------- Inlogbewijs van Cloudflare Access ---------- */

const enc = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const cfg = { teamDomain: "team.cloudflareaccess.com", aud: "aud-123" };
let keys: CryptoKeyPair;
let jwk: JsonWebKey;

beforeAll(async () => {
  keys = (await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  jwk = { ...(await crypto.subtle.exportKey("jwk", keys.publicKey)), kid: "k1" } as JsonWebKey;
});

async function token(payload: object, kid = "k1") {
  const head = enc({ alg: "RS256", kid });
  const body = enc(payload);
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, new TextEncoder().encode(`${head}.${body}`)));
  return `${head}.${body}.${btoa(String.fromCharCode(...sig)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")}`;
}

const certsFetch = (async () => new Response(JSON.stringify({ keys: [jwk] }))) as unknown as typeof fetch;
const now = Date.now();
const good = { aud: ["aud-123"], iss: "https://team.cloudflareaccess.com", exp: Math.floor(now / 1000) + 600, email: "Speler@Voorbeeld.nl" };

describe("inlogbewijs", () => {
  afterEach(() => _resetCertCache());

  it("een geldig bewijs geeft het e-mailadres (kleine letters)", async () => {
    expect(await verifyAccessJwt(await token(good), cfg, certsFetch, now)).toBe("speler@voorbeeld.nl");
  });

  it("verkeerde doelgroep, uitgever, verlopen of onbekende sleutel: geweigerd", async () => {
    expect(await verifyAccessJwt(await token({ ...good, aud: ["ander"] }), cfg, certsFetch, now)).toBeNull();
    expect(await verifyAccessJwt(await token({ ...good, iss: "https://evil.example" }), cfg, certsFetch, now)).toBeNull();
    expect(await verifyAccessJwt(await token({ ...good, exp: Math.floor(now / 1000) - 5 }), cfg, certsFetch, now)).toBeNull();
    expect(await verifyAccessJwt(await token(good, "onbekend"), cfg, certsFetch, now)).toBeNull();
  });

  it("aangepaste inhoud met de oude handtekening: geweigerd", async () => {
    const [h, , s] = (await token(good)).split(".");
    const forged = `${h}.${enc({ ...good, email: "baas@voorbeeld.nl" })}.${s}`;
    expect(await verifyAccessJwt(forged, cfg, certsFetch, now)).toBeNull();
  });

  it("beheerder alleen als het adres in de lijst staat", () => {
    expect(roleOf("Job@x.nl", "job@x.nl, ander@x.nl")).toBe("owner");
    expect(roleOf("lid@x.nl", "job@x.nl")).toBe("member");
    expect(roleOf("lid@x.nl", undefined)).toBe("member");
  });
});

/* ---------- Eindpunten (met een nagebootste GitHub) ---------- */

const players = {
  players: [
    { id: "a", name: "Zichtbaar Speler", position: "Verdediger", type: "vast", hiddenNo: null, active: true, clubName: null },
    { id: "b", name: "Geheime Naam", position: "Aanvaller", type: "vast", hiddenNo: 1, active: true, clubName: null },
  ],
};
const repoFiles: Record<string, unknown> = {
  "players.json": players,
  "feedback.json": { items: [{ id: "f1", createdAt: "", page: "/", width: 1, text: "privé feedback", status: "open" }] },
};

function fakeGitHub(store: Record<string, unknown> = repoFiles) {
  const writes: { path: string; body: { content: string; sha?: string } }[] = [];
  const f = vi.fn(async (url: string, init?: RequestInit) => {
    const file = url.split("/").pop()!;
    if (init?.method === "PUT") {
      const body = JSON.parse(String(init.body));
      writes.push({ path: file, body });
      if (body.sha === "oud") return new Response("{}", { status: 409 });
      store[file] = JSON.parse(atob(body.content));
      return new Response(JSON.stringify({ content: { sha: "nieuw" } }));
    }
    if (!(file in store)) return new Response("{}", { status: 404 });
    return new Response(JSON.stringify({ content: b64encode(JSON.stringify(store[file])), sha: "s1" }));
  });
  vi.stubGlobal("fetch", f);
  return { f, writes, store };
}

const env = (email: string): Env => ({ GITHUB_TOKEN: "t", ACCESS_TEAM_DOMAIN: "x", ACCESS_AUD: "y", OWNER_EMAILS: "baas@x.nl", DEV_EMAIL: email });
const req = (path: string, init: RequestInit = {}) => new Request(`http://localhost${path}`, init);

describe("eindpunten", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("een lid ziet de afgeschermde namen, maar geen feedback", async () => {
    fakeGitHub();
    const res = await getData({ request: req("/api/data"), env: env("lid@x.nl") });
    const data = await res.json();
    expect(JSON.stringify(data)).toContain("Geheime Naam");
    expect(data["feedback.json"].items).toEqual([]);
    expect(Object.keys(data).sort()).toEqual([...DATA_FILES].sort());
  });

  it("de beheerder ziet ook de feedback", async () => {
    fakeGitHub();
    const data = await (await getData({ request: req("/api/data"), env: env("baas@x.nl") })).json();
    expect(data["feedback.json"].items).toHaveLength(1);
  });

  it("zonder login (en zonder testadres) geen data", async () => {
    fakeGitHub();
    const res = await getData({ request: req("/api/data"), env: { ...env("x"), DEV_EMAIL: undefined } });
    expect(res.status).toBe(401);
  });

  it("het testadres werkt alleen op localhost", async () => {
    fakeGitHub();
    const res = await getData({ request: new Request("https://peursum4.pages.dev/api/data"), env: env("baas@x.nl") });
    expect(res.status).toBe(401);
  });

  it("een lid mag niet opslaan; de beheerder wel, en een botsing geeft 409", async () => {
    const { writes } = fakeGitHub({ ...repoFiles });
    const put = (email: string, sha: string, headers: Record<string, string> = { "X-P4": "1" }) =>
      putFile({
        request: req("/api/file", { method: "PUT", headers, body: JSON.stringify({ name: "players.json", data: players, sha, message: "test" }) }),
        env: env(email),
      });
    expect((await put("lid@x.nl", "s1")).status).toBe(403);
    expect((await put("baas@x.nl", "s1", {})).status).toBe(403); // zonder eigen kop (andere site)
    expect((await put("baas@x.nl", "oud")).status).toBe(409);
    expect((await put("baas@x.nl", "s1")).status).toBe(200);
    expect(writes.at(-1)?.body.sha).toBe("s1");
  });

  it("toegang aanvragen zet de aanvraag in de data-repository", async () => {
    const { store } = fakeGitHub({});
    const res = await postRequest({
      request: req("/open/aanvraag", { method: "POST", headers: { "X-P4": "1" }, body: JSON.stringify({ name: "Nieuwe Speler", email: "Nieuw@X.nl", note: "speler" }) }),
      env: { ...env("x"), DEV_EMAIL: undefined },
    });
    expect(res.status).toBe(200);
    expect((store["aanvragen.json"] as { requests: { email: string }[] }).requests[0].email).toBe("nieuw@x.nl");
  });
});

describe("aanvragen", () => {
  it("controleert naam, e-mail en de onzichtbare robotval", () => {
    expect(cleanRequest({ name: "A", email: "a@b.nl" })).toHaveProperty("error");
    expect(cleanRequest({ name: "Anna", email: "geen-mail" })).toHaveProperty("error");
    expect(cleanRequest({ name: "Anna", email: "a@b.nl", website: "spam.nl" })).toHaveProperty("error");
    expect(cleanRequest({ name: "  Anna   de  Vries ", email: "A@B.nl" })).toEqual({ name: "Anna de Vries", email: "a@b.nl", note: "" });
  });

  it("geen dubbele aanvragen en een maximum aan open aanvragen", () => {
    const one = addRequest({ requests: [] }, { name: "Anna", email: "a@b.nl", note: "" }, "1", "t1");
    if ("error" in one) throw new Error();
    const again = addRequest(one, { name: "Anna V", email: "a@b.nl", note: "x" }, "2", "t2");
    if ("error" in again) throw new Error();
    expect(again.requests).toHaveLength(1);
    expect(again.requests[0].name).toBe("Anna V");
    const full = { requests: Array.from({ length: MAX_OPEN }, (_, i) => ({ id: `${i}`, name: "x", email: `${i}@b.nl`, note: "", at: "", status: "open" as const })) };
    expect(addRequest(full, { name: "Laat", email: "laat@b.nl", note: "" }, "z", "t")).toHaveProperty("error");
  });
});

it("lege bestanden bestaan voor elk databestand", () => {
  for (const f of DATA_FILES) expect(EMPTY[f]).toBeDefined();
});
