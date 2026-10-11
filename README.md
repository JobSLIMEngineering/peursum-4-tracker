# Peursum 4 Tracker

Persoonlijke web-app voor Peursum 4 (VV Peursum, 5e klasse 521, zaterdag reserve):
stand, programma, uitslagen, winkans en zelf ingevoerde spelersstatistieken.

De opdracht staat in [docs/PLAN.md](docs/PLAN.md) (10 okt 2026). Uiterlijk en interactie
volgen [docs/prototype.html](docs/prototype.html); data komt eenmalig uit
[docs/seed-data.json](docs/seed-data.json). Het oude plan (PDF, 1 okt) is vervangen.

## Opzet: alles op GitHub

| Onderdeel | Waar |
| --- | --- |
| App (deze repository, **openbaar**) | GitHub Pages: <https://jobslimengineering.github.io/peursum-4-tracker/> |
| Gegevens (**privé**) | [`JobSLIMEngineering/peursum-4-data`](https://github.com/JobSLIMEngineering/peursum-4-data), map `data/` met JSON-bestanden |
| Clubsite ophalen | GitHub Action *Ophalen clubsite* in de data-repository (zaterdag elk uur, zondag 4×, plus "Nu verversen") |
| Inloggen | Wachtwoord. Dat ontsleutelt in de browser een GitHub-sleutel die versleuteld in `public/toegang.json` staat (PBKDF2 600.000 rondes + AES-GCM) |

Dit wijkt bewust af van PLAN.md §2 (Vercel + Supabase): de eigenaar wil geen extra accounts.
Wat er in de praktijk anders is:

- Wijzigingen worden binnen een paar seconden opgeslagen als commit in de data-repository.
- Inloggen met een wachtwoord (minstens 12 tekens). Vergeten? Op het inlogscherm een nieuwe
  GitHub-sleutel maken en een nieuw wachtwoord kiezen; je GitHub-account zelf herstel je via e-mail.
- De sleutel heeft alleen toegang tot `peursum-4-data` en `peursum-4-tracker` (Contents + Actions).
- De Supabase-ping op woensdag is niet nodig.

**Gasten** kiezen op het inlogscherm "Verder als gast" en kunnen alleen kijken. Zij lezen een
kijkversie (`kijk.json` op de branch `kijk` van deze repository) zonder namen van afgeschermde
spelers, zonder bijnamen en zonder feedback. De app van de eigenaar werkt die kijkversie
automatisch bij na elke wijziging (zie `src/lib/store/public.ts`).

Techniek: Next.js 16 als statische export (geen server), TypeScript, Tailwind 4, Vitest, tsx voor de scraper.

## Lokaal starten

```bash
npm install
npm run dev
```

Open http://localhost:3000. Lokaal werkt de app met de seed-data in je browser (zie
`.env.development`); er gaat niets naar GitHub. Tegen de echte data testen: maak
`.env.development.local` met `NEXT_PUBLIC_DATA=github`.

## Scripts

| Commando            | Wat het doet                      |
| ------------------- | --------------------------------- |
| `npm run dev`       | Ontwikkelserver                   |
| `npm run build`     | Productie-build                   |
| `npm test`          | Tests eenmalig draaien            |
| `npm run test:watch`| Tests draaien bij elke wijziging  |
| `npm run lint`      | ESLint                            |
| `npm run typecheck` | TypeScript-controle               |
| `npm run parse:live`| Parser één keer tegen de echte clubsite draaien |
| `npm run sync -- --data <map> [--force]` | Scraper draaien op een lokale kopie van `data/` |
| `npm run data:init -- <map>` | Inhoud van een nieuwe data-repository klaarzetten |
| `npm run icons`     | App-iconen opnieuw maken in `public/icons/` |
| `npm run art`       | Rode vonk-textuur en penseelstreek (Instagram-stijl) opnieuw maken |

## Parser voor de clubsite

De data komt van de teampagina
<https://www.vvpeursum.nl/peursum-4-ve-zaterdag-speeldag-man> (Sportlink-clubsite).
De parser staat in `src/lib/parser/`:

| Bestand | Inhoud |
| --- | --- |
| `teamPage.ts` | Per sectie een functie: spelers, staf, programma, uitslagen, poulestand, volgende wedstrijd |
| `dates.ts` | Datums zonder jaartal ("3 okt.") → jaar uit het seizoen (juli = start) |
| `names.ts` | "Berg, Rien van den" → "Rien van den Berg", functie → positie |
| `matchType.ts` | Competitie = tegenstander staat in de poule, anders oefen (beker stel je zelf in) |
| `__fixtures__/` | Opgeslagen kopie van de pagina waar de tests op draaien |

### Repareren als de clubsite verandert

1. `npm run parse:live` haalt de echte pagina één keer op en laat zien wat er gelezen
   wordt. Een fout noemt de sectie, bijvoorbeeld `[Poulestanden] kolom PT is geen getal`.
2. Sla een nieuwe kopie op als testbestand:
   ```bash
   curl -sL "https://www.vvpeursum.nl/peursum-4-ve-zaterdag-speeldag-man" -o src/lib/parser/__fixtures__/teampagina-JJJJ-MM-DD.html
   ```
3. Kijk in die HTML wat er veranderd is. De parser zoekt secties op de kop
   (`<h4 class="nxs-title">Programma</h4>`) en cellen op hun class (`td.Naam`, `td.PT`).
4. Pas `teamPage.ts` aan, zet het nieuwe bestand in `teamPage.test.ts` en pas de
   verwachte waarden aan. `npm test` moet weer slagen.

## Omgevingsvariabelen

| Variabele | Waar | Doel |
| --- | --- | --- |
| `NEXT_PUBLIC_BASE_PATH` | GitHub Action *Publiceren* | `/peursum-4-tracker` op GitHub Pages |
| `NEXT_PUBLIC_DATA` | `.env.development` | `local` = testdata in de browser |

Er staan geen geheimen in de code of in de repositories. De GitHub-sleutel staat alleen in de
browser van je eigen apparaten.

## Voortgang (PLAN.md §9)

1. [x] **Basis**: kopbalk met 4 tabs, feedbackknop, PWA-manifest en iconen, inloggen met GitHub-sleutel.
   Nog te doen: online zetten (repository openbaar + Pages aan).
2. [x] **Data**: beginstand uit seed-data (132 wedstrijden, 20 uitslagen, 12 teams, 22 spelers).
   Nog te doen: data-repository aanmaken en vullen.
3. [x] **Overzicht + Competitie**: stand, volgende wedstrijd, per-wedstrijd-statistieken, rondes, wijzigen/toevoegen.
4. [x] **Team + invoer**: selectie, posities, afgeschermde namen, leenspelers, aanwezigheidslijst, stats.
5. [x] **Match center**: model, matrix, laatste 3, deelpost.
6. [x] **Scraper**: `scripts/sync.ts` + Action, snapshots, afleiden van uitslagen, Nu verversen.

Controles uit PLAN.md staan als tests in `src/lib/domain/domain.test.ts` en `src/lib/sync/apply.test.ts`.

## Toegevoegd aan versie 1 (na het plan)

- **Feedbackknop:** klein icoon onderin op elk scherm. Opent een tekstvak; de melding
  wordt met pagina, schermbreedte en tijdstip opgeslagen in de tabel `feedback`, met
  status open/verwerkt. Meldingen worden later in één keer verwerkt.

## Stijl en logo's

De app en de deelposts volgen de Instagram van Peursum 4: zwart met rode vonken
(`public/texture.jpg`), penseeltitels in *Protest Revolution* met een rode streek
(`public/brush.png`), score in penseelletters (Peursum wit, tegenstander rood).

Clublogo's staan lokaal in `public/logos/<clubcode>.png`, omdat logo's van voetbal.nl niet in
een canvas (de deelpost) mogen worden getekend. Nieuwe tegenstander (volgend seizoen)?
Haal het logo op met
`curl -o public/logos/CODE.png "https://logoapi.voetbal.nl/logo.php?clubcode=CODE"` en zet de
code in `src/lib/logos.ts`.
