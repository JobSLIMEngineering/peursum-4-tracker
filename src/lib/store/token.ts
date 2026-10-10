// De GitHub-sleutel staat alleen in de browser van dit apparaat (localStorage).
const KEY = "p4-github-token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(KEY, token.trim());
  } catch {
    // privévenster of geblokkeerde opslag: sleutel werkt dan alleen deze sessie niet
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // negeren
  }
}

/** Lokale modus (npm run dev:local): data in de browser, geen sleutel nodig. */
export const LOCAL_MODE = process.env.NEXT_PUBLIC_DATA === "local";
