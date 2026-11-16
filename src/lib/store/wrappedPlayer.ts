import { rateMatch, seasonRatings } from "@/lib/domain/rating";
import { playerSeason } from "@/lib/domain/season-stats";
import { opponent, ourScore, playerLabel, US } from "@/lib/domain/types";
import type { StoredPlayer } from "./schema";
import type { AppView } from "./view";

const comma = (x: number, d = 1) => x.toFixed(d).replace(".", ",");

/** Eén kaart van Wrapped (zelfde vorm als bij het team) */
export interface WrappedSlide {
  key: string;
  kicker: string;
  title: string;
  big?: string;
  sub?: string;
  shirts?: StoredPlayer[];
  walkout?: { playerId: string; banner: string; special?: boolean };
  logo?: string;
  list?: { award?: string; text: string }[];
}

/**
 * Wrapped van één speler: zijn seizoen in een paar kaarten. Alleen wat hij echt deed; een kaart zonder
 * inhoud (geen goals, geen maatje) valt weg. Alles positief: dit is om te delen.
 */
export function playerSlides(view: AppView, id: string, edition: string): WrappedSlide[] {
  const p = view.players.find((x) => x.id === id);
  if (!p) return [];
  const me = playerLabel(p);
  const by = (x: string | undefined) => view.players.find((q) => q.id === x);
  const ps = playerSeason(id, view.rows, view.players, view.matches, view.entries, view.thisMonth);
  const out: WrappedSlide[] = [{ key: "intro", kicker: edition, title: me, sub: "Jouw seizoen bij Peursum 4 tot nu toe.", shirts: [p] }];
  if (!ps.games) return [...out, { key: "outro", kicker: "Nog even geduld", title: "Nog geen wedstrijden ingevoerd" }];

  out.push({
    key: "opkomst",
    kicker: "Op het veld",
    title: `${ps.games} van de ${view.rows.length} wedstrijden`,
    big: `${Math.round((ps.games / Math.max(1, ps.available)) * 100)}%`,
    sub: `${ps.record.w}× gewonnen, ${ps.record.d}× gelijk, ${ps.record.l}× verloren met jou erbij`,
  });

  if (ps.keeper && ps.keeper.games >= ps.games / 2)
    out.push({
      key: "keeper",
      kicker: "Onder de lat",
      title: ps.keeper.cleanSheets ? "De laatste man" : "Keeper van dienst",
      big: `${ps.keeper.cleanSheets}× de nul`,
      sub: `${ps.keeper.against} tegengoals in ${ps.keeper.games} duels, ${comma(ps.keeper.expected)} verwacht`,
    });
  if (ps.goals || ps.assists)
    out.push({
      key: "goals",
      kicker: "Goals en assists",
      title: ps.goals >= ps.assists ? "Doelpuntenmaker" : "De aangever",
      big: `${ps.goals} + ${ps.assists}`,
      sub: `${ps.goals} ${ps.goals === 1 ? "goal" : "goals"} en ${ps.assists} ${ps.assists === 1 ? "assist" : "assists"}${ps.hattricks ? ` · ${ps.hattricks}× een hattrick` : ""}`,
    });

  const ranking = seasonRatings(view.rows, view.players).sort((a, b) => b.total - a.total);
  const rank = ranking.findIndex((r) => r.playerId === id) + 1;
  if (rank)
    out.push({
      key: "punten",
      kicker: "Spelerspunten",
      title: rank === 1 ? "Nummer 1 van het team" : `Plek ${rank} in het team`,
      big: comma(ps.points),
      sub: `${comma(ps.perGame)} per wedstrijd`,
    });

  // Beste wedstrijd: de meeste spelerspunten
  const best = view.rows
    .filter((r) => r.entry.attendance.includes(id))
    .map((r) => ({ r, x: rateMatch(r, view.players).find((m) => m.playerId === id)! }))
    .filter((b) => b.x)
    .sort((a, b) => b.x.total - a.x.total)[0];
  if (best && best.x.total > 0) {
    const [f, a] = ourScore(best.r.match)!;
    const g = best.r.entry.stats[id]?.goals ?? 0;
    out.push({
      key: "best",
      kicker: "Jouw beste wedstrijd",
      title: `${best.r.match.home === US ? "Thuis" : "Uit"} tegen ${opponent(best.r.match)}`,
      big: `${f}–${a}`,
      sub: `${comma(best.x.total)} spelerspunten${g ? `, ${g} ${g === 1 ? "goal" : "goals"}` : ""}`,
      logo: opponent(best.r.match),
    });
  }

  if (ps.motm)
    out.push({
      key: "motm",
      kicker: "Man van de wedstrijd",
      title: ps.motm === 1 ? "Eén keer de beste op het veld" : `${ps.motm} keer de beste op het veld`,
      big: `${ps.motm}×`,
      sub: ps.potm ? `En ${ps.potm}× speler van de maand` : "de meeste spelerspunten van iedereen in die wedstrijd",
    });
  else if (ps.potm)
    out.push({ key: "motm", kicker: "Speler van de maand", title: "De beste van de maand", big: `${ps.potm}×` });

  const partner = ps.partner && by(ps.partner.partnerId);
  if (ps.partner && partner && ps.partner.goals >= 1)
    out.push({
      key: "maatje",
      kicker: "Beste maatje",
      title: `${me} & ${playerLabel(partner)}`,
      big: `${ps.partner.goals}× samen`,
      sub: "goals waarbij de een de ander aangaf",
      shirts: [p, partner],
    });

  const imp = view.impacts[id];
  if (imp?.eligible && imp.pointsImpact >= 0.1)
    out.push({
      key: "invloed",
      kicker: "Jouw invloed",
      title: "Met jou gaat het beter",
      big: `+${comma(imp.pointsImpact)}`,
      sub: "punten per wedstrijd boven verwachting met jou erbij, vergeleken met zonder jou",
    });

  const months = (view.monthly.overall[id] ?? []).filter((x): x is number => x != null);
  const card = view.cards[id];
  if (card) {
    const first = months[0];
    const up = first != null && card.overall > first ? card.overall - first : 0;
    const special = view.special[id];
    out.push({
      key: "kaart",
      kicker: "Jouw kaart",
      title: up ? `${up} ${up === 1 ? "punt" : "punten"} gestegen` : "Zo sta je erop",
      big: String(card.overall),
      sub: up ? `Begonnen op ${first}, nu ${card.overall}` : undefined,
      walkout: { playerId: id, banner: special?.banner ?? "Jouw seizoen", special: !!special },
    });
  }

  if (ps.milestones.length)
    out.push({ key: "mijlpalen", kicker: "Mijlpalen", title: "Al gehaald", list: ps.milestones.map((m) => ({ text: m })) });

  out.push({ key: "outro", kicker: "Op naar meer", title: "#PEURSUM4" });
  return out;
}
