import type { GameRow, PlayerImpact } from "./awards";
import { attendanceRates, injuryEffect } from "./insights";
import { ownVsLoan } from "./loans";
import { predict, type Fit } from "./model";
import { lastMatches } from "./stats";
import { isPlayed, opponent, ourScore, ROLE_POSITION, US, type Match, type Player, type Position, type StandingRow } from "./types";

/**
 * Adviezen van de "assistent-trainer": regels op basis van de cijfers. Elke regel geeft hooguit één
 * advies, met een gewicht (hoe dringend). Alleen wat de cijfers echt laten zien; bij te weinig
 * wedstrijden zwijgt een regel liever.
 */

export type AdviceKind = "selectie" | "tactiek" | "wedstrijd";

export interface Advice {
  key: string;
  kind: AdviceKind;
  /** "goed" = iets om vast te houden, "let op" = iets om aan te werken */
  tone: "goed" | "let op";
  title: string;
  text: string;
  /** Hoe belangrijk (hoger = eerder getoond) */
  weight: number;
}

export interface AdviceInput {
  rows: GameRow[];
  players: (Pick<Player, "id" | "name" | "hiddenNo" | "type" | "active" | "position" | "role"> & { injured?: boolean })[];
  /** Kaartcijfer per speler */
  overall: Record<string, number>;
  impacts: Record<string, PlayerImpact>;
  model: Fit;
  matches: Match[];
  pool: Set<string>;
  injured: Set<string>;
  /** Eerstvolgende wedstrijd (voor de wedstrijdtips) */
  next?: Match | null;
  standings?: StandingRow[];
  label: (id: string) => string;
}

const LINES: Position[] = ["Keeper", "Verdediger", "Middenvelder", "Aanvaller"];
/** Hoeveel je er per linie nodig hebt in een 4-3-3 */
const NEED: Record<Position, number> = { Keeper: 1, Verdediger: 4, Middenvelder: 3, Aanvaller: 3, Onbekend: 0 };
const LINE_NAME: Record<Position, string> = {
  Keeper: "keepers",
  Verdediger: "verdedigers",
  Middenvelder: "middenvelders",
  Aanvaller: "aanvallers",
  Onbekend: "spelers",
};
const LINE_TITLE: Record<Position, string> = {
  Keeper: "Doel",
  Verdediger: "Verdediging",
  Middenvelder: "Middenveld",
  Aanvaller: "Aanval",
  Onbekend: "Overig",
};
const MIN_ROWS = 3;

const comma = (x: number, d = 1) => x.toFixed(d).replace(".", ",");
const lineOf = (p: AdviceInput["players"][number]): Position => (p.role ? ROLE_POSITION[p.role] : p.position);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function buildAdvice(inp: AdviceInput): Advice[] {
  const out: Advice[] = [];
  const add = (a: Advice | null | false | undefined) => a && out.push(a);
  const vast = inp.players.filter((p) => p.active && p.type === "vast");
  const enough = inp.rows.length >= MIN_ROWS;

  // ── Selectie ────────────────────────────────────────────────────────────
  if (enough) {
    const rates = attendanceRates(inp.rows, vast.map((p) => p.id));
    // Gemiddeld beschikbaar per linie (hoe vaak iedereen meedoet, zonder wie nu geblesseerd is)
    const avail = (line: Position) => sum(vast.filter((p) => lineOf(p) === line && !inp.injured.has(p.id)).map((p) => rates[p.id] ?? 0));
    const short = LINES.map((l) => ({ l, have: avail(l), gap: NEED[l] - avail(l) })).sort((a, b) => b.gap - a.gap)[0];
    if (short && short.gap >= 0.5)
      add({
        key: "diepte",
        kind: "selectie",
        tone: "let op",
        title: `Te weinig ${LINE_NAME[short.l]}`,
        text: `Gemiddeld zijn er maar ${comma(short.have)} ${LINE_NAME[short.l]} uit de eigen selectie, terwijl je er ${NEED[short.l]} nodig hebt. Hier zou ik als eerste een speler aantrekken.`,
        weight: 60 + short.gap * 10,
      });

    const keepers = vast.filter((p) => lineOf(p) === "Keeper");
    if (keepers.length === 1)
      add({
        key: "keeper",
        kind: "selectie",
        tone: "let op",
        title: "Maar één vaste keeper",
        text: `Valt ${inp.label(keepers[0].id)} uit, dan staat er iemand op doel die dat niet gewend is. Een tweede keeper (of een veldspeler die af en toe traint als keeper) is geen overbodige luxe.`,
        weight: 45,
      });

    const lv = ownVsLoan(inp.rows, inp.players);
    const loanShare = lv.loan.games / (lv.loan.games + lv.own.games || 1);
    if (loanShare >= 0.4)
      add({
        key: "leen",
        kind: "selectie",
        tone: "let op",
        title: "Vaak leenspelers nodig",
        text: `In ${lv.loan.games} van de ${lv.loan.games + lv.own.games} duels deden er leenspelers mee (gemiddeld ${comma(lv.loansPerGame)}). Dat werkt, maar is kwetsbaar: met een of twee vaste spelers erbij ben je daar minder van afhankelijk.`,
        weight: 40 + loanShare * 30,
      });

    const present = inp.rows.map((r) => r.entry.attendance.filter((id) => vast.some((p) => p.id === id)).length);
    const avgPresent = sum(present) / present.length;
    if (avgPresent < 13)
      add({
        key: "wissels",
        kind: "selectie",
        tone: "let op",
        title: "Weinig wissels",
        text: `Gemiddeld ${comma(avgPresent)} vaste spelers per wedstrijd, dus ${avgPresent < 11 ? "niet eens een volledig elftal" : "nauwelijks wissels"}. In de tweede helft wordt dat zwaar; zorg voor ${Math.ceil(14 - avgPresent)} spelers extra in de groep of vraag vroeg in de week wie er kan.`,
        weight: avgPresent < 11 ? 70 : 35,
      });
  }

  // Sterkte per linie (kaartcijfers van de vaste spelers)
  const lineAvg = LINES.filter((l) => l !== "Keeper")
    .map((l) => {
      const xs = vast.filter((p) => lineOf(p) === l && inp.overall[p.id] != null).map((p) => inp.overall[p.id]);
      return { l, n: xs.length, avg: xs.length ? sum(xs) / xs.length : 0 };
    })
    .filter((x) => x.n >= 2)
    .sort((a, b) => a.avg - b.avg);
  if (lineAvg.length >= 2) {
    const weak = lineAvg[0];
    const strong = lineAvg.at(-1)!;
    if (strong.avg - weak.avg >= 3)
      add({
        key: "linie",
        kind: "selectie",
        tone: "let op",
        title: `${LINE_TITLE[weak.l]} is het lichtst`,
        text: `De ${LINE_NAME[weak.l]} staan gemiddeld op ${Math.round(weak.avg)}, de ${LINE_NAME[strong.l]} op ${Math.round(strong.avg)}. Versterk de ${LINE_NAME[weak.l]}, of probeer een van de ${LINE_NAME[strong.l]} op die plek.`,
        weight: 30 + (strong.avg - weak.avg) * 3,
      });
  }

  // ── Tactiek ─────────────────────────────────────────────────────────────
  const teams = [...inp.pool].filter((t) => inp.model.attack[t] != null);
  if (teams.length >= 4 && inp.model.attack[US] != null) {
    const attRank = 1 + teams.filter((t) => inp.model.attack[t] > inp.model.attack[US]).length;
    const defRank = 1 + teams.filter((t) => inp.model.defence[t] < inp.model.defence[US]).length;
    const n = teams.length;
    if (attRank - defRank >= 3)
      add({
        key: "balans",
        kind: "tactiek",
        tone: "let op",
        title: "Verdediging staat, voorin kan meer",
        text: `We verdedigen als nummer ${defRank} van de ${n}, maar aanvallend zijn we pas ${attRank}e. Durf met een extra man mee te gaan (een opkomende back of een middenvelder in de zestien) en speel sneller naar voren.`,
        weight: 50,
      });
    else if (defRank - attRank >= 3)
      add({
        key: "balans",
        kind: "tactiek",
        tone: "let op",
        title: "We scoren genoeg, maar krijgen te veel tegen",
        text: `Aanvallend zijn we ${attRank}e van de ${n}, verdedigend maar ${defRank}e. Laat het middenveld dichter bij de verdediging spelen en houd een middenvelder achter de bal als we aanvallen.`,
        weight: 50,
      });
    else if (attRank <= 3 && defRank <= 3)
      add({
        key: "balans",
        kind: "tactiek",
        tone: "goed",
        title: "Goed in balans",
        text: `Aanvallend ${attRank}e en verdedigend ${defRank}e van de ${n}. Vasthouden: dit is de basis van een topploeg.`,
        weight: 20,
      });
  }

  if (enough) {
    const fin = sum(inp.rows.map((r) => r.gfDiff)) / inp.rows.length;
    if (fin <= -0.4)
      add({
        key: "afronding",
        kind: "tactiek",
        tone: "let op",
        title: "Afronding laat punten liggen",
        text: `We scoren gemiddeld ${comma(-fin)} goal per duel minder dan verwacht tegen deze tegenstanders. Afronden trainen helpt, en de beste afmaker vaker in schietpositie brengen.`,
        weight: 40 + -fin * 20,
      });
    else if (fin >= 0.5)
      add({
        key: "afronding",
        kind: "tactiek",
        tone: "goed",
        title: "Vlijmscherp voor de goal",
        text: `We scoren ${comma(fin)} goal per duel meer dan verwacht. Mooi, maar dat houdt zelden het hele seizoen aan: zorg dat er ook genoeg kansen komen.`,
        weight: 15,
      });

    const goals: Record<string, number> = {};
    let total = 0;
    let set = 0;
    let yellow = 0;
    for (const r of inp.rows)
      for (const [id, s] of Object.entries(r.entry.stats)) {
        goals[id] = (goals[id] ?? 0) + s.goals;
        total += s.goals;
        set += (s.penalties ?? 0) + (s.freeKicks ?? 0);
        yellow += s.yellow ? 1 : 0;
      }
    const top = Object.entries(goals).sort((a, b) => b[1] - a[1])[0];
    if (top && total >= 8 && top[1] / total >= 0.4)
      add({
        key: "afhankelijk",
        kind: "tactiek",
        tone: "let op",
        title: `Erg afhankelijk van ${inp.label(top[0])}`,
        text: `${Math.round((top[1] / total) * 100)}% van onze goals komt van ${inp.label(top[0])}. Wordt hij goed gedekt, dan wordt het lastig. Zoek ook de tweede man: middenvelders vaker mee in de zestien.`,
        weight: 35,
      });
    if (total >= 8 && set / total >= 0.3)
      add({
        key: "standaard",
        kind: "tactiek",
        tone: "goed",
        title: "Sterk uit standaardsituaties",
        text: `${set} van de ${total} goals kwamen uit een penalty of vrije trap. Blijf die trainen: in een gesloten wedstrijd beslist dit vaak.`,
        weight: 18,
      });
    if (yellow / inp.rows.length >= 1.5)
      add({
        key: "kaarten",
        kind: "tactiek",
        tone: "let op",
        title: "Veel gele kaarten",
        text: `Gemiddeld ${comma(yellow / inp.rows.length)} geel per wedstrijd. Minder praten tegen de scheids en minder late overtredingen voorkomt dat we met tien eindigen.`,
        weight: 25,
      });

    // Thuis tegenover uit (punten per duel)
    const ppg = (home: boolean) => {
      const g = inp.rows.filter((r) => (r.match.home === US) === home);
      if (g.length < 2) return null;
      return sum(g.map((r) => { const [f, a] = ourScore(r.match)!; return f > a ? 3 : f === a ? 1 : 0; })) / g.length;
    };
    const ph = ppg(true);
    const pa = ppg(false);
    if (ph != null && pa != null && Math.abs(ph - pa) >= 1)
      add({
        key: "thuisuit",
        kind: "tactiek",
        tone: "let op",
        title: ph > pa ? "Uit loopt het minder" : "Thuis loopt het minder",
        text: `Thuis ${comma(ph)} punten per duel, uit ${comma(pa)}. ${ph > pa ? "Uit eerst compact beginnen en het eerste kwartier geen risico nemen." : "Thuis ligt de druk hoger; begin rustig en laat de tegenstander het spel maken."}`,
        weight: 30,
      });

    // Vorm: laatste 3 tegenover het seizoen
    if (inp.rows.length >= 6) {
      const last3 = sum(inp.rows.slice(-3).map((r) => r.ptsDiff)) / 3;
      if (last3 <= -0.7)
        add({
          key: "vorm",
          kind: "tactiek",
          tone: "let op",
          title: "Dip in de vorm",
          text: `De laatste 3 duels haalden we ${comma(-last3)} punt per duel minder dan verwacht. Tijd om iets te veranderen: een andere opstelling of een extra training.`,
          weight: 45,
        });
      else if (last3 >= 0.7)
        add({
          key: "vorm",
          kind: "tactiek",
          tone: "goed",
          title: "In vorm",
          text: `De laatste 3 duels ${comma(last3)} punt per duel boven verwachting. Niet te veel veranderen aan een ploeg die draait.`,
          weight: 20,
        });
    }
  }

  // ── Volgende wedstrijd ──────────────────────────────────────────────────
  const nx = inp.next;
  if (nx && inp.pool.has(opponent(nx)) && inp.model.attack[opponent(nx)] != null) {
    const opp = opponent(nx);
    const n = teams.length;
    const oAtt = 1 + teams.filter((t) => inp.model.attack[t] > inp.model.attack[opp]).length;
    const oDef = 1 + teams.filter((t) => inp.model.defence[t] < inp.model.defence[opp]).length;
    // Hoe sterk is de tegenstander in het algemeen? (winkans en plek op de ranglijst)
    const p = predict(inp.model, US, opp, nx.home === US);
    const oRow = inp.standings?.find((r) => r.team === opp);
    const top = !!oRow && oRow.position <= 3;
    const low = !!oRow && oRow.position > n - Math.ceil(n / 3);
    if (p.win < 0.35)
      add({
        key: "w-sterk",
        kind: "wedstrijd",
        tone: "let op",
        title: "Sterke tegenstander: scherp beginnen",
        text: `${opp} ${oRow ? `staat ${oRow.position}e met ${oRow.points} punten en ` : ""}onze winkans is maar ${Math.round(p.win * 100)}%. Vanaf de eerste minuut scherp: duels winnen, geen slordige ballen op eigen helft, en het eerste kwartier geen tegengoal. Een punt is hier ook goed.`,
        weight: 58,
      });
    else if (top)
      add({
        key: "w-sterk",
        kind: "wedstrijd",
        tone: "let op",
        title: "Topper: scherp beginnen",
        text: `${opp} staat ${oRow!.position}e met ${oRow!.points} punten. We zijn ${p.win >= 0.5 ? `favoriet (${Math.round(p.win * 100)}% winkans), maar in een topper` : `aan elkaar gewaagd (${Math.round(p.win * 100)}% winkans), en in een topper`} beslist vaak het begin: vanaf de eerste minuut scherp, duels winnen en geen slordige ballen op eigen helft.`,
        weight: 58,
      });
    else if (p.win >= 0.6 && low)
      add({
        key: "w-zwak",
        kind: "wedstrijd",
        tone: "goed",
        title: "Favoriet, maar niet onderschatten",
        text: `${opp} staat ${oRow!.position}e en onze winkans is ${Math.round(p.win * 100)}%. Zoek vroeg de 1–0; daarna geduldig blijven en niet slordig worden.`,
        weight: 40,
      });

    // Vorm van de tegenstander: de laatste 3 duels
    const form = lastMatches(inp.matches, opp, 3);
    if (form.length === 3) {
      const pts = form.reduce((a, g) => a + (g.goalsFor > g.goalsAgainst ? 3 : g.goalsFor === g.goalsAgainst ? 1 : 0), 0);
      if (pts >= 9)
        add({
          key: "w-vorm",
          kind: "wedstrijd",
          tone: "let op",
          title: `${opp} is in vorm`,
          text: `Laatste 3 gewonnen (${form.map((g) => `${g.goalsFor}–${g.goalsAgainst}`).join(", ")}). Ze komen met vertrouwen: verwacht dat ze vroeg druk zetten.`,
          weight: 42,
        });
      else if (pts <= 1)
        add({
          key: "w-vorm",
          kind: "wedstrijd",
          tone: "goed",
          title: `${opp} zit in een dip`,
          text: `Uit de laatste 3 maar ${pts} punt${pts === 1 ? "" : "en"}. Meteen druk zetten: een vroege goal doet bij een ploeg zonder vertrouwen extra pijn.`,
          weight: 38,
        });
    }

    // Thuis- of uitploeg: hoe doen zij het op hun eigen veld of juist uit?
    const theirs = lastMatches(inp.matches, opp, 99).filter((g) => g.home === (nx.home !== US));
    if (theirs.length >= 2) {
      const ppg = theirs.reduce((a, g) => a + (g.goalsFor > g.goalsAgainst ? 3 : g.goalsFor === g.goalsAgainst ? 1 : 0), 0) / theirs.length;
      if (nx.home !== US && ppg >= 2.2)
        add({
          key: "w-thuis",
          kind: "wedstrijd",
          tone: "let op",
          title: `${opp} is thuis sterk`,
          text: `Thuis halen ze ${comma(ppg)} punten per duel. Uit eerst overleven: het eerste halfuur compact, en de ruimte zoeken als zij moeten komen.`,
          weight: 36,
        });
      else if (nx.home === US && ppg <= 0.8)
        add({
          key: "w-uit",
          kind: "wedstrijd",
          tone: "goed",
          title: `${opp} doet het uit slecht`,
          text: `Uit maar ${comma(ppg)} punt per duel. Thuis het initiatief nemen en hoog druk zetten.`,
          weight: 32,
        });
    }

    if (oAtt <= 3)
      add({
        key: "w-aanval",
        kind: "wedstrijd",
        tone: "let op",
        title: `${opp} scoort veel: start verdedigend`,
        text: `Aanvallend ${oAtt}e van de ${n}. Begin compact met de linies dicht bij elkaar, backs eerst verdedigen, en een middenvelder blijft altijd voor de verdediging. Pas als het staat, meer naar voren.`,
        weight: 50,
      });
    if (oDef >= n - 2)
      add({
        key: "w-verdediging",
        kind: "wedstrijd",
        tone: "goed",
        title: `${opp} geeft veel weg`,
        text: `Verdedigend pas ${oDef}e van de ${n}. Zet vroeg druk op hun verdediging en schiet vaker van afstand: hier liggen goals.`,
        weight: 45,
      });
    if (oAtt > 3 && oDef < n - 2 && oDef <= 3)
      add({
        key: "w-muur",
        kind: "wedstrijd",
        tone: "let op",
        title: `${opp} staat goed`,
        text: `Verdedigend ${oDef}e van de ${n}: kansen zullen schaars zijn. Geduld, de bal laten rondgaan en standaardsituaties goed benutten.`,
        weight: 35,
      });

    const before = inp.matches.filter((m) => m.kind === "competitie" && isPlayed(m) && opponent(m) === opp && (m.home === US || m.away === US)).at(-1);
    if (before) {
      const [f, a] = ourScore(before)!;
      add({
        key: "w-vorige",
        kind: "wedstrijd",
        tone: f > a ? "goed" : "let op",
        title: "Vorige keer",
        text: `${before.home === US ? "Thuis" : "Uit"} werd het ${f}–${a}${f > a ? ". Zelfde aanpak, maar zij zijn gewaarschuwd." : f === a ? ". Een kleine stap meer en het zijn drie punten." : ". Er staat iets recht te zetten."}`,
        weight: 25,
      });
    }

    if (inp.injured.size) {
      const base = predict(inp.model, US, opp, nx.home === US);
      const fx = injuryEffect(base, inp.injured, inp.impacts, attendanceRates(inp.rows, [...inp.injured]));
      const drop = Math.round(base.win * 100) - Math.round(fx.now.win * 100);
      const worst = fx.players[0];
      if (drop >= 5 && worst)
        add({
          key: "w-blessures",
          kind: "wedstrijd",
          tone: "let op",
          title: "Blessures kosten winkans",
          text: `Zonder de geblesseerden zakt de winkans ${drop}%. Vooral ${inp.label(worst.id)} wordt gemist; bedenk vooraf wie zijn rol overneemt.`,
          weight: 55,
        });
    }
  }

  return out.sort((a, b) => b.weight - a.weight);
}
