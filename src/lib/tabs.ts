/** Vaste knoppen in de balk (ook vegen gaat tussen deze drie) */
export const TABS = [
  { href: "/", label: "Overzicht" },
  { href: "/competitie/", label: "Competitie" },
  { href: "/match-center/", label: "Match" },
];

/** Schermen onder de knop met de drie streepjes */
export const MORE = [
  { href: "/prijzen/", label: "Prijzen", sub: "Wie gaat er met de bekers vandoor?" },
  { href: "/team/", label: "Spelers", sub: "Selectie, rugnummers en stats" },
];

const ALL = [...TABS, ...MORE];

/** Index van het scherm bij een pad ("/competitie/?w=…" hoort bij Competitie); menu-schermen na de tabs */
export function tabIndex(path: string): number {
  const p = path.replace(/\/?$/, "/");
  const i = ALL.findIndex((t) => t.href !== "/" && p.startsWith(t.href));
  return i === -1 ? 0 : i;
}

export const isMorePage = (path: string) => tabIndex(path) >= TABS.length;

/** Richting van de laatste schermwissel: 1 = naar rechts, -1 = naar links. */
let lastIndex = -1;
export function directionTo(path: string): -1 | 0 | 1 {
  const i = tabIndex(path);
  const dir = lastIndex === -1 || i === lastIndex ? 0 : i > lastIndex ? 1 : -1;
  lastIndex = i;
  return dir;
}
