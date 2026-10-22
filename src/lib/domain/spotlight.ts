import { played, wasInjured, type GameRow } from "./awards";
import type { Prediction } from "./model";
import { ourScore, type Player, type StandingRow } from "./types";

/**
 * "Let op deze speler": een paar kaartjes vóór de volgende wedstrijd, FIFA-stijl.
 * Altijd voor deze specifieke tegenstander: kansen komen uit de voorspelling, de tekst uit
 * hoe de tegenstander ervoor staat. De formulering wisselt per wedstrijd.
 *
 * - Scorer: kans dat hij scoort = 1 − e^(−λ), λ = zijn aandeel in onze goals × verwachte goals.
 * - Aangever: meeste assists (vooral recent).
 * - Keeper: kans op de nul = kans dat de tegenstander 0 maakt, plus zijn reeks.
 * Wie bij de laatste wedstrijd geblesseerd was, komt er niet in.
 */

export type SpotKind = "scorer" | "aangever" | "keeper";

export interface Spotlight {
  kind: SpotKind;
  playerId: string;
  /** Kopregel op het kaartje, bijv. "Topscorer in vorm" */
  tag: string;
  /** Een of twee zinnen voor deze wedstrijd */
  text: string;
  /** Grote kans op het kaartje (0–1) met label */
  chance: number;
  chanceLabel: string;
  /** Twee kleine cijfers onderaan */
  facts: { value: string; label: string }[];
}

interface Input {
  players: Pick<Player, "id" | "position" | "active">[];
  rows: GameRow[];
  prediction: Pick<Prediction, "xgUs" | "xgThem" | "matrix">;
  opponent: string;
  standings: StandingRow[];
  /** Om de formulering per wedstrijd te laten wisselen */
  seed: string;
}

const comma = (x: number, d = 1) => x.toFixed(d).replace(".", ",");

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Plek van een team in een rangorde (1 = beste), met het aantal teams */
function rankOf(standings: StandingRow[], team: string, f: (r: StandingRow) => number, asc: boolean) {
  const list = standings.filter((r) => r.played).sort((a, b) => (asc ? f(a) - f(b) : f(b) - f(a)));
  return { rank: list.findIndex((r) => r.team === team) + 1, teams: list.length };
}

export function spotlights({ players, rows, prediction, opponent, standings, seed }: Input): Spotlight[] {
  if (!rows.length) return [];
  const pick = <T>(xs: T[], salt: string) => xs[hash(seed + salt) % xs.length];
  const last = rows.at(-1)!;
  const fit = players.filter((p) => p.active && !wasInjured(last, p.id));
  const opp = standings.find((r) => r.team === opponent);
  const oppGA = opp?.played ? opp.goalsAgainst / opp.played : null;
  const oppGF = opp?.played ? opp.goalsFor / opp.played : null;
  const defRank = opp ? rankOf(standings, opponent, (r) => r.goalsAgainst / r.played, true) : null;
  const attRank = opp ? rankOf(standings, opponent, (r) => r.goalsFor / r.played, false) : null;
  const ourGoals = rows.reduce((s, r) => s + ourScore(r.match)![0], 0);

  const stat = (id: string, key: "goals" | "assists", rs = rows) =>
    rs.filter((r) => played(r, id)).reduce((s, r) => s + (r.entry.stats[id]?.[key] ?? 0), 0);
  const games = (id: string, rs = rows) => rs.filter((r) => played(r, id)).length;
  const recent = rows.slice(-3);
  const out: Spotlight[] = [];

  // --- Scorer: seizoen + vorm (laatste 3 dubbel) ---
  const scorer = fit
    .filter((p) => p.position !== "Keeper" && stat(p.id, "goals") > 0)
    .map((p) => ({ p, heat: stat(p.id, "goals") / (games(p.id) + 1) + (2 * stat(p.id, "goals", recent)) / 3 }))
    .sort((a, b) => b.heat - a.heat)[0];
  if (scorer && ourGoals) {
    const id = scorer.p.id;
    const g = stat(id, "goals");
    const gr = stat(id, "goals", recent);
    // Zijn aandeel in onze goals in de duels waarin hij meedeed, afgevlakt met één schijnduel
    const teamInHisGames = rows.filter((r) => played(r, id)).reduce((s, r) => s + ourScore(r.match)![0], 0);
    const share = g / (teamInHisGames + ourGoals / rows.length);
    const chance = 1 - Math.exp(-share * prediction.xgUs);
    let text: string;
    if (defRank && oppGA !== null && defRank.rank > defRank.teams - 4)
      text = pick(
        [
          `${opponent} kreeg ${comma(oppGA)} tegen per duel. Als er één de deur intrapt, is hij het.`,
          `${opponent} lekt ${comma(oppGA)} goals per duel (${defRank.rank}e verdediging). Dit is zijn middag.`,
        ],
        "s-weak",
      );
    else if (defRank && defRank.rank <= 3)
      text = pick(
        [
          `${opponent} heeft de ${defRank.rank}e verdediging van de poule. Hier heb je een afmaker voor nodig.`,
          `Tegen de ${defRank.rank}e verdediging telt elke kans. Hij moet het verschil maken.`,
        ],
        "s-strong",
      );
    else
      text = pick(
        [
          gr >= 2 ? `${gr} goals in de laatste ${recent.length} duels. Blijft de vlam branden?` : `${g} goals dit seizoen en altijd gevaarlijk in de zestien.`,
          `Onze grootste doelpuntenmaker. Zet hem op de stip.`,
        ],
        "s-mid",
      );
    out.push({
      kind: "scorer",
      playerId: id,
      tag: pick(["Let op deze speler", "Topscorer in vorm", "De afmaker"], "s-tag"),
      text,
      chance,
      chanceLabel: "kans dat hij scoort",
      facts: [
        { value: String(g), label: g === 1 ? "goal" : "goals" },
        { value: String(gr), label: `laatste ${recent.length}` },
      ],
    });
  }

  // --- Aangever ---
  const creator = fit
    .filter((p) => p.id !== scorer?.p.id && stat(p.id, "assists") >= 2)
    .map((p) => ({ p, heat: stat(p.id, "assists") / (games(p.id) + 1) + (2 * stat(p.id, "assists", recent)) / 3 }))
    .sort((a, b) => b.heat - a.heat)[0];
  if (creator) {
    const id = creator.p.id;
    const a = stat(id, "assists");
    const ar = stat(id, "assists", recent);
    const perGame = a / Math.max(1, games(id));
    out.push({
      kind: "aangever",
      playerId: id,
      tag: pick(["De spelmaker", "Let op de laatste pass", "Assistkanon"], "a-tag"),
      text:
        attRank && attRank.rank <= 3
          ? pick([`${opponent} scoort zelf veel; wij moeten het antwoord hebben. Zijn passes maken het verschil.`], "a-strong")
          : pick(
              [
                `${a} assists dit seizoen. Als de spitsen lopen, vindt hij ze.`,
                `Gemiddeld ${comma(perGame)} assist per duel. De motor achter onze goals.`,
              ],
              "a-mid",
            ),
      chance: 1 - Math.exp(-perGame * (prediction.xgUs / Math.max(0.5, ourGoals / rows.length))),
      chanceLabel: "kans op een assist",
      facts: [
        { value: String(a), label: a === 1 ? "assist" : "assists" },
        { value: String(ar), label: `laatste ${recent.length}` },
      ],
    });
  }

  // --- Keeper: wie de laatste keer keepte (als hij fit is) ---
  const keeperId = [...rows].reverse().find((r) => r.entry.keeperId)?.entry.keeperId;
  if (keeperId && fit.some((p) => p.id === keeperId)) {
    const kept = rows.filter((r) => r.entry.keeperId === keeperId);
    let run = 0;
    for (let i = kept.length - 1; i >= 0 && ourScore(kept[i].match)![1] === 0; i--) run++;
    const lastGA = ourScore(kept.at(-1)!.match)![1];
    const cs = kept.filter((r) => ourScore(r.match)![1] === 0).length;
    const ga = kept.reduce((s, r) => s + ourScore(r.match)![1], 0);
    const cleanSheet = prediction.matrix.reduce((s, row) => s + row[0], 0);
    const att = attRank && oppGF !== null ? ` ${opponent} scoort ${comma(oppGF)} per duel (${attRank.rank}e aanval).` : "";
    const text =
      run >= 1
        ? pick([`${run} ${run === 1 ? "clean sheet" : "clean sheets op rij"}. Zet hij de lijn door?`, `De nul staat al ${run} ${run === 1 ? "duel" : "duels"}. Houdt hij hem dicht?`], "k-run") + att
        : lastGA >= 3
          ? pick([`Vorige keer ${lastGA} tegen. Tijd om zich te herpakken.`, `Na ${lastGA} tegengoals wil hij iets rechtzetten.`], "k-bad") + att
          : pick([`${cs} clean ${cs === 1 ? "sheet" : "sheets"} dit seizoen. Vandaag de volgende?`, `De laatste man. Eén redding kan de punten pakken.`], "k-mid") + att;
    out.push({
      kind: "keeper",
      playerId: keeperId,
      tag: run >= 2 ? "Muur op de lijn" : "De laatste man",
      text,
      chance: cleanSheet,
      chanceLabel: "kans op de nul",
      facts: [
        { value: String(cs), label: cs === 1 ? "clean sheet" : "clean sheets" },
        { value: comma(ga / kept.length), label: "tegen/duel" },
      ],
    });
  }

  return out;
}
