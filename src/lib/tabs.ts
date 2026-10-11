export const TABS = [
  { href: "/", label: "Overzicht" },
  { href: "/competitie/", label: "Competitie" },
  { href: "/match-center/", label: "Match center" },
  { href: "/team/", label: "Team" },
];

/** Index van de tab bij een pad ("/competitie/?w=…" hoort bij Competitie) */
export function tabIndex(path: string): number {
  const p = path.replace(/\/?$/, "/");
  const i = TABS.findIndex((t) => t.href !== "/" && p.startsWith(t.href));
  return i === -1 ? 0 : i;
}

/** Richting van de laatste tabwissel: 1 = naar rechts (volgende tab), -1 = naar links. */
let lastIndex = -1;
export function directionTo(path: string): -1 | 0 | 1 {
  const i = tabIndex(path);
  const dir = lastIndex === -1 || i === lastIndex ? 0 : i > lastIndex ? 1 : -1;
  lastIndex = i;
  return dir;
}
