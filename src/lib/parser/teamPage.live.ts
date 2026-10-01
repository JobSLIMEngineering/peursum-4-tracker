import { describe, expect, it } from "vitest";
import { parseTeamPage, TEAM_NAME, TEAM_PAGE_URL } from "./index";

// Live controle tegen de echte clubsite. Draait alleen met `npm run parse:live`
// (eigen bestandsnaam, dus `npm test` belast de clubsite niet).
describe("live teampagina", () => {
  it("geeft bruikbare data terug", async () => {
    const res = await fetch(TEAM_PAGE_URL, {
      headers: { "User-Agent": "Peursum4Tracker (persoonlijk gebruik)" },
    });
    expect(res.ok).toBe(true);

    const page = parseTeamPage(await res.text());
    const own = page.standings.find((s) => s.team === TEAM_NAME);
    console.log(
      [
        `Spelers: ${page.players.length} met naam + ${page.hiddenPlayerCount} verborgen`,
        `Staf: ${page.staff.length}`,
        `Programma: ${page.program.length} wedstrijden`,
        `Uitslagen: ${page.results.map((m) => `${m.homeTeam} - ${m.awayTeam} ${m.homeGoals}-${m.awayGoals}`).join(" | ")}`,
        `Poule: ${page.poolName}, ${page.standings.length} teams, ${TEAM_NAME} op ${own?.position} met ${own?.points} punten`,
        `Volgende: ${page.nextMatch?.homeTeam} - ${page.nextMatch?.awayTeam}, ${page.nextMatch?.date} ${page.nextMatch?.time}, ${page.nextMatch?.venue}`,
      ].join("\n"),
    );

    expect(page.standings.some((s) => s.team === TEAM_NAME)).toBe(true);
    expect(page.players.length).toBeGreaterThan(0);
    expect(page.results.length + page.program.length).toBeGreaterThan(0);
  }, 30_000);
});
