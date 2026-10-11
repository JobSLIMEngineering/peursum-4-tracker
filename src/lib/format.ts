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

/** Aftrap ("2026-10-31", "12:30") in Nederlandse tijd als Date, ongeacht de tijdzone van het apparaat */
export function kickoff(date: string, time: string | null): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = (time ?? "12:00").split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  // Verschil tussen Nederlandse tijd en UTC op dat moment (zomer- of wintertijd)
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(guess));
  const n = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asIfUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"));
  return new Date(guess - (asIfUtc - guess));
}

/** "nog 19 dagen", "nog 1 dag 4u", "nog 2u 15m", "nu bezig" of null als hij voorbij is */
export function countdown(to: Date, now: Date = new Date()): string | null {
  const min = Math.floor((to.getTime() - now.getTime()) / 60000);
  if (min <= -120) return null;
  if (min <= 0) return "nu bezig";
  const days = Math.floor(min / 1440);
  const hours = Math.floor((min % 1440) / 60);
  if (days >= 2) return `nog ${days} dagen`;
  if (days === 1) return `nog 1 dag ${hours}u`;
  return `nog ${hours}u ${min % 60}m`;
}
