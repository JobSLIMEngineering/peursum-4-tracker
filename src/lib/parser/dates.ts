const MONTHS: Record<string, number> = {
  jan: 1, januari: 1,
  feb: 2, februari: 2,
  mrt: 3, maart: 3,
  apr: 4, april: 4,
  mei: 5,
  jun: 6, juni: 6,
  jul: 7, juli: 7,
  aug: 8, augustus: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Het seizoen begint in juli: in oktober 2026 is dat 2026, in maart 2027 ook 2026. */
export function seasonStartYear(today: Date): number {
  return today.getMonth() + 1 >= 7 ? today.getFullYear() : today.getFullYear() - 1;
}

/** Seizoen als tekst, bijvoorbeeld "2026/2027". */
export function seasonLabel(isoDate: string): string {
  const start = seasonStartYear(new Date(`${isoDate}T12:00:00`));
  return `${start}/${start + 1}`;
}

/**
 * Leest een Nederlandse datum zonder jaartal ("3 okt.", "26 sep. 15:00").
 * Het jaar wordt afgeleid uit het seizoen: juli t/m december = beginjaar, januari t/m juni = jaar erna.
 * Een datum met jaartal ("03 oktober 2026") wordt ook herkend.
 */
export function parseDutchDate(
  text: string,
  today: Date,
): { date: string; time: string | null } {
  const m = text
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})\s+([a-z]+)\.?(?:\s+(\d{4}))?(?:\s+(\d{1,2}:\d{2}))?/);
  if (!m) throw new Error(`Onbekend datumformaat: "${text}"`);

  const day = Number(m[1]);
  const month = MONTHS[m[2]];
  if (!month) throw new Error(`Onbekende maand in datum: "${text}"`);

  const start = seasonStartYear(today);
  const year = m[3] ? Number(m[3]) : month >= 7 ? start : start + 1;
  const time = m[4] ? m[4].padStart(5, "0") : null;

  return { date: `${year}-${pad(month)}-${pad(day)}`, time };
}
