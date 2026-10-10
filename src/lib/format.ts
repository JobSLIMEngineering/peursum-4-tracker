const MON = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const DAY = ["zo", "ma", "di", "wo", "do", "vr", "za"];
export const DAY_FULL = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
export const MON_FULL = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

/** "za 31 okt", met dag en maand los voor de datumblokjes */
export function fmtDate(d: string | null) {
  if (!d) return { day: "—", mon: "", full: "Datum onbekend" };
  const x = new Date(`${d}T12:00`);
  return { day: String(x.getDate()), mon: MON[x.getMonth()], full: `${DAY[x.getDay()]} ${x.getDate()} ${MON[x.getMonth()]}` };
}

export const pct = (x: number) => Math.round(x * 100);

/** Datum van vandaag in Nederland, als yyyy-mm-dd */
export function todayNL(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(now);
}

/** "10 okt" uit een ISO-tijdstip */
export function shortDate(iso: string | null) {
  if (!iso) return "";
  const x = new Date(iso);
  return `${x.getDate()} ${MON[x.getMonth()]}`;
}
