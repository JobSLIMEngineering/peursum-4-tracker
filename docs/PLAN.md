# Peursum 4 Tracker — bouwopdracht voor Claude Code

Peildatum: 10 oktober 2026 · Eigenaar: Job

Dit pakket bevat alles om versie 1 te bouwen:

| Bestand | Wat het is | Hoe te gebruiken |
| --- | --- | --- |
| `PLAN.md` | Deze opdracht: wat de app doet, regels, datamodel, bouwvolgorde | Leidend voor scope en gedrag |
| `prototype.html` | Werkend prototype (één HTML-bestand) dat samen met de eigenaar is ontworpen | **Referentie voor uiterlijk én logica.** Neem schermen, teksten, kleuren en de rekenfuncties hieruit over. Niet als code kopiëren, wel als specificatie lezen. |
| `seed-data.json` | Stand, alle 132 competitiewedstrijden (20 gespeeld, met uitslag), selectie, sportparken | Eenmalig importeren in de database bij de eerste deploy |

Bij twijfel tussen dit plan en het prototype: **het prototype wint voor uiterlijk en interactie, dit plan wint voor data, opslag en techniek.**

Dit plan **vervangt** `docs/Plan Peursum 4 Tracker.pdf` (1 oktober). Waar die twee verschillen, geldt dit plan.

## 0. Bestaande code — hierop voortbouwen, niet opnieuw beginnen

In deze repository staat al werk uit het eerste plan:

| Onderdeel | Status | Wat ermee te doen |
| --- | --- | --- |
| Next.js 16 + TypeScript + Tailwind 4 + Vitest | Klaar | Houden. Lees `AGENTS.md`: Next.js 16 wijkt af, lees eerst `node_modules/next/dist/docs/`. |
| Supabase-clients (`src/lib/supabase/`) en `env.ts` | Klaar | Houden. |
| Parser clubsite (`src/lib/parser/`, met tests en fixture) | Klaar | Houden en hergebruiken in de scraper (stap 6). Uitbreiden met het opslaan van de volledige stand als snapshot. |
| Vercel, database, login, schermen, invoer | Nog niet | Volgens de bouwvolgorde hieronder. |
| Feedbackknop (uit README) | Gepland | Blijft in versie 1: klein icoon onderin elk scherm, tekstvak, opslaan in tabel `feedback` (pagina, schermbreedte, tijdstip, status open/verwerkt). |

Werkafspraken uit `README.txt` blijven gelden: geheimen alleen in `.env.local`, Vercel en GitHub; vraag Job om akkoord na stap 2 en na stap 5; de map staat in OneDrive, dus pauzeer OneDrive bij sync-problemen tijdens `npm install`. Werk de voortgang in `README.md` bij na elke stap.

---

## 1. Doel

Een persoonlijke app om het voetbalteam **Peursum 4** (VV Peursum, Giessenburg, 5e klasse 521, zaterdag reserve) bij te houden: stand, programma, uitslagen, een winkans voor de volgende wedstrijd, en zelf ingevoerde spelersstatistieken. Alles draait om Peursum 4; andere teams zijn context.

- **Gebruiker:** alleen de eigenaar.
- **Apparaten:** telefoon en laptop. Eén web-app die op de telefoon als app op het beginscherm kan (PWA).
- **Taal:** alles in het Nederlands.
- **Kosten:** gratis hosting.

## 2. Techniek

| Onderdeel | Keuze |
| --- | --- |
| Framework | Next.js (App Router) + TypeScript |
| Hosting | Vercel (gratis) |
| Database + login | Supabase (Postgres + Auth, gratis). Login met e-mail magic link; alleen het e-mailadres van de eigenaar mag inloggen. |
| Ophalen data | Geplande GitHub Action die een scraper draait en in Supabase schrijft |
| Telefoon | PWA: manifest, icoon, `display: standalone`, themakleur `#e1242f`. Installeren via "Zet op beginscherm". |
| Opslag invoer | Alles in Supabase (niet in de browser), zodat telefoon en laptop dezelfde data zien |

## 3. Schermen

Vier tabs in de rode kopbalk: **Overzicht · Competitie · Match center · Team**. Op de telefoon staan de tabs onder het logo op één regel.

### 3.1 Overzicht
- Rood blok **Volgende wedstrijd**: datum, tijd, tegenstander, thuis/uit, positie tegenstander, label (Favoriet / Pittig / Lastig), balk winst-gelijk-verlies, verwachte goals, knop naar Match center.
- **Topscorer** en **Topassist**: alleen nummer 1 (bij gelijkstand alle namen), groot getal.
- **Per wedstrijd**: gemiddeld goals voor, goals tegen en punten per wedstrijd, met de plek in de poule op die statistiek ("1e van 12") en W/G/V.
- **Stand**: compacte, volledige stand (12 teams): #, team, G, DS, P. Peursum 4 als volle rode rij, volgende tegenstander gemarkeerd met "volgende".

### 3.2 Competitie
- Twee kolommen (telefoon: onder elkaar): **Komende rondes** en **Gespeelde rondes**.
- Per **ronde (1 t/m 22)** één uitklapbare regel: rondenummer, datum, en direct de Peursum-wedstrijd van die ronde (tegenstander, thuis/uit, uitslag of winkans). Uitgeklapt: alle 6 wedstrijden van die ronde, Peursum bovenaan en uitgelicht.
- **Inhaalwedstrijden** zijn aparte, rustigere groepen tussen de rondes.
- Een ronde met een Peursum-wedstrijd staat pas bij "Gespeeld" als de Peursum-uitslag bekend is.
- Standaard open: de eerstvolgende Peursum-ronde en de laatst gespeelde ronde. Open/dicht onthouden per apparaat.
- Alleen Peursum-wedstrijden zijn klikbaar → wedstrijddetail.
- Knop **+ Wedstrijd** (eigen wedstrijd toevoegen, bv. beker of oefen).

### 3.3 Wedstrijddetail (vanuit Competitie)
- **Komend:** knop **Wijzigen** (tegenstander, datum, aftrap, thuis/uit, soort, veld/locatie). Handmatige wijzigingen krijgen label "aangepast" en worden **niet** overschreven door de scraper. Knop "Terug naar clubsite" zet de opgehaalde waarden terug. Eigen toegevoegde wedstrijden zijn te verwijderen.
- **Gespeeld:** uitslag, goals en assists, keeper, kaarten, aanwezigen. Knop **Opstelling en stats invoeren / Bewerken** (zie 4).

### 3.4 Match center
Alleen over de **eerstvolgende competitiewedstrijd**:
- Rode hero: Peursum 4 vs tegenstander, datum, tijd, sportpark.
- Knop **Delen als post** (zie 6).
- **Voorspelling**: kans winst/gelijk/verlies, verwachte goals per kant, meest waarschijnlijke uitslag.
- **Uitslagmatrix**: kans per uitslag 0–5 × 0–5 (rood = winst, geel = gelijk, grijs = verlies), meest waarschijnlijke omlijnd.
- **Laatste 3 · Peursum 4**: laatste 3 competitiewedstrijden met huidige positie van de tegenstander.
- **Laatste 3 · tegenstander**: idem voor de tegenstander, plus één regel seizoenssamenvatting.
- Korte uitleg van het model onderaan.

### 3.5 Team
- **Vaste selectie**: naam (inline aanpasbaar), positie (Keeper / Verdediger / Middenvelder / Aanvaller / Onbekend), opkomst, goals, assists, kaarten, verwijderen. Toevoegen met naam + positie.
- **Afgeschermde spelers**: de clubsite verbergt 5 namen. Die staan als lege, invulbare rijen ("Afgeschermd 1 · naam invullen", oranje rand).
- **Leenspelers**: aparte lijst, komen binnen via de aanwezigheidslijst; knop "→ Selectie".
- **Keepers**: duels, clean sheets, tegengoals.
- Geen rugnummers.

## 4. Invoer na een wedstrijd

Stap 1 — **Aanwezig**
- Plakveld voor de lijst die de eigenaar per wedstrijd krijgt (WhatsApp-tekst of opsomming). Parser: splits op regels/komma's/puntkomma's, verwijder nummering, bullets, emoji en tekst tussen haakjes.
- Matching op genormaliseerde naam (kleine letters, zonder accenten): exacte match → voornaam + achternaam → unieke voornaam.
- Onbekende namen: kiezen **Leen** (standaard) of **Selectie**, dan toevoegen.
- Daarnaast handmatig spelers aantikken (chips).

Stap 2 — **Stats** per aanwezige speler
- Teller goals (− / +), teller assists, knop G (geel), knop R (rood), knop Keeper (één per wedstrijd).
- Teller **Eigen goal tegenstander**.
- Melding "x van y goals toegewezen"; waarschuwen als het niet klopt met de uitslag, opslaan mag altijd.

**Regels**
- Alleen **competitiewedstrijden** tellen mee voor alle statistieken. Beker/oefen worden getoond maar tellen niet.
- Tegengoals en clean sheet komen uit de uitslag en gaan alleen op naam van de keeper.
- Twee keer geel in één wedstrijd telt als rood.
- Opkomst = aantal competitiewedstrijden aanwezig.

## 5. Data

### 5.1 Bronnen
| Data | Bron |
| --- | --- |
| Stand, programma Peursum, selectie | Teampagina `https://www.vvpeursum.nl/peursum-4-ve-zaterdag-speeldag-man` (Sportlink-widgets) |
| Volledig poule-programma en uitslagen ronde 1–4 | Eenmalig uit `seed-data.json` (overgenomen uit de voetbal.nl-app) |
| Uitslagen andere teams vanaf nu | **Afgeleid uit de wekelijkse stand** (5.3) |

Er is geen officiële API (persoonlijk gebruik). voetbal.nl niet scrapen.

### 5.2 Scraper-schema
- **Zaterdag:** elk uur 13:00–23:00.
- **Zondag:** elke 4 uur, alleen als de ronde nog niet compleet is; na 20:00 stoppen.
- **Doordeweeks:** niet ophalen. Wel een knop **Nu verversen** in de app.
- **Woensdag:** lichte ping naar Supabase zodat het gratis project niet pauzeert.
- "Ronde compleet" = Peursum-uitslag binnen én het totaal aantal gespeelde wedstrijden in de stand met een volle ronde gestegen.
- Elke run slaat de **volledige stand op als snapshot** (datum + per team G/W/G/V/voor/tegen/punten/positie).
- **Positie altijd overnemen van de site** (KNVB-volgorde), nooit zelf sorteren.

### 5.3 Uitslagen afleiden uit standen
Elk team speelt één wedstrijd per ronde. Tussen twee snapshots:
1. Per team met +1 gespeeld: score = (Δvoor, Δtegen).
2. Twee teams met gespiegelde score (3-1 en 1-3) hebben tegen elkaar gespeeld.
3. Zijn er meerdere kandidaten, dan beslist het programma (wie volgens schema tegen wie speelde).
4. Thuis/uit komt uit het programma.
5. Lukt het niet eenduidig: markeren als "onzeker", niet raden.
Zie `deriveRound()` in het prototype.

### 5.4 Datamodel
| Tabel | Velden |
| --- | --- |
| `teams` | id, naam, sportpark |
| `standings_snapshots` | id, opgehaald_op |
| `standings_rows` | snapshot_id, team_id, positie, gespeeld, winst, gelijk, verlies, voor, tegen, punten |
| `matches` | id, ronde (nullable), inhaal (bool), datum, tijd, thuis_team_id, uit_team_id, uitslag_thuis, uitslag_uit, sportpark, soort (competitie/beker/oefen), status (gepland/gespeeld/niet ingepland), bron (seed/scraper/afgeleid/handmatig), handmatig_aangepast (bool) |
| `players` | id, naam (nullable bij afgeschermd), positie, type (vast/leen), afgeschermd_nr, actief |
| `match_attendance` | match_id, player_id |
| `match_player_stats` | match_id, player_id, goals, assists, geel (bool), rood (bool) |
| `match_meta` | match_id, keeper_player_id, eigen_goals_tegenstander |

## 6. Delen als post (Match center)
- Genereert een afbeelding van **1080 × 1350** (Instagram-post) in de app-stijl, zonder winkans.
- Inhoud: "MATCHDAY", datum + tijd, PEURSUM 4 vs tegenstander, tabel (positie, punten, gespeeld, W·G·V, goals voor p/w, goals tegen p/w) voor beide teams, vorm Peursum (laatste 3), topscorer (als er stats zijn), rode voetbalk met sportpark en `#PEURSUM4`.
- Opslaan als PNG; op de telefoon via het deelmenu (Web Share API met bestand) zodat hij direct naar Instagram kan.
- Zie `drawShare()` in het prototype voor de exacte opbouw.

## 7. Winkansmodel
Overnemen uit het prototype (`fit()` en `predict()`):
- Gemiddeld aantal goals per team per wedstrijd in de poule: μ = Σvoor / Σgespeeld.
- Per team aanvalssterkte *a* en verdedigingssterkte *d*, iteratief geschat (50 iteraties, genormaliseerd op gemiddelde 1) uit goals voor/tegen, **gecorrigeerd voor de sterkte van de tegenstanders** tegen wie gespeeld is. Bij onbekende tegenstander: gemiddelde tegenstander.
- Krimp naar het gemiddelde met K = 2 pseudo-wedstrijden (kleine aantallen).
- Verwachte goals: λ_thuis = μ · a_thuis · d_uit · 1,1 en λ_uit = μ · a_uit · d_thuis / 1,1 (thuisvoordeel 10%).
- Poisson-verdeling 0–9 goals per kant → kans winst/gelijk/verlies en matrix.
- Label: ≥ 60% winst "Favoriet", ≥ 40% "Pittig", anders "Lastig".
- Alleen competitie, alleen poule-tegenstanders.

## 8. Vormgeving
Volg `prototype.html`. Kern:
- Donker (`#0d0b0c`), clubrood `#e1242f`, donkerrood `#a3121c`; kaarten `#171415`, lijnen `#2e282a`.
- Achtergrond: subtiele overgang donkerrood → zwart, rode gloed rechtsonder; inhoud in één omkaderd venster met rode bovenrand.
- Kopbalk: strak rood vlak met donkere schuine banen en een schuine onderkant. Logo "PEURSUM" in Anton (hoofdletters, licht schuin) met de "4" in een zwart blok met harde schaduw. Tabs als schuine blokken, actieve tab zwart.
- Lettertypes: Anton (logo, grote cijfers), Barlow Condensed (labels, teamnamen, hoofdletters met letterafstand), Barlow (tekst).
- Uitslagkleuren: winst `#2fbf62`, gelijk `#f0b429`, verlies `#e5484d`.
- Tabellen met tabulaire cijfers.

## 9. Bouwvolgorde
Elke stap is los te testen.

1. **Basis** — voortbouwen op het bestaande project: Supabase gekoppeld, login alleen voor de eigenaar, PWA-manifest en icoon, kopbalk met 4 lege tabs in de juiste stijl, feedbackknop, deploy op Vercel.
   *Klaar als:* app opent op telefoon en laptop, inloggen werkt, op beginscherm te zetten.
2. **Data** — tabellen aanmaken, `seed-data.json` importeren.
   *Klaar als:* 132 wedstrijden, 20 met uitslag, 12 teams, 22 spelers in de database.
3. **Overzicht + Competitie** — stand, volgende wedstrijd, per-wedstrijd-statistieken, rondes met uitklappen, wijzigen/toevoegen van wedstrijden.
   *Klaar als:* ronde 6 (Leerdam, 31 okt) staat open, VVAC–Peursum staat in ronde 5 als "niet ingepland".
4. **Team + invoer** — selectie, posities, afgeschermde namen, leenspelers, aanwezigheidslijst plakken, stats invoeren, regels uit 4.
   *Klaar als:* na invoer van een wedstrijd kloppen topscorer, assists, opkomst, kaarten en keeper-stats; 2× geel telt als rood.
5. **Match center** — model uit 7, matrix, laatste 3, deelpost uit 6.
   *Klaar als:* Peursum–Leerdam geeft ±70% winst en ±2,2 – 0,8 verwachte goals met de seed-data (zelfde als het prototype).
6. **Scraper** — de bestaande parser aanroepen vanuit `/api/sync` (beveiligd met `SYNC_SECRET`), GitHub Action volgens 5.2, snapshots, afleiden uit 5.3, "Nu verversen", handmatige wijzigingen blijven staan.
   *Klaar als:* na de speelronde van 24 okt staan de nieuwe uitslagen van alle teams vanzelf in Competitie.

## 10. Open punten
- **VVAC 6 – Peursum 4** (ronde 5) is nog niet ingepland; datum invullen zodra bekend.
- **5 afgeschermde spelers**: namen worden door de eigenaar ingevuld.
- **Posities** van 12 spelers staan op "Onbekend"; eigenaar vult aan.
- **Stats van ronde 1–4** worden door de eigenaar ingevoerd.
- Exacte clubkleuren/logo: optioneel aanleveren; nu benaderd.

## 11. Later (niet in versie 1)
- Schorsingsrisico op basis van gele kaarten.
- Speelminuten en wissels.
- Delen met teamgenoten (alleen-lezen link).
- Uitslagpost na de wedstrijd (zelfde stijl als de matchday-post).
- Sportlink-data-API als de club een sleutel geeft.
