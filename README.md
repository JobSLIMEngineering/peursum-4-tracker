# Peursum 4 Tracker

Persoonlijke web-app voor Peursum 4 (VV Peursum, 5e klasse 521, zaterdag reserve):
stand, programma, uitslagen, winkans en zelf ingevoerde spelersstatistieken.

De opdracht staat in [docs/PLAN.md](docs/PLAN.md) (10 okt 2026). Uiterlijk en interactie
volgen [docs/prototype.html](docs/prototype.html); data komt eenmalig uit
[docs/seed-data.json](docs/seed-data.json). Het oude plan (PDF, 1 okt) is vervangen.

## Techniek

- Next.js 16 (App Router, TypeScript) + Tailwind CSS 4
- Supabase (Postgres + login via magic link)
- Vitest voor tests
- GitHub Actions voor het geplande ophalen van de clubsite (vanaf stap 3)

## Lokaal starten

```bash
npm install
cp .env.example .env.local   # en vul de waarden in
npm run dev
```

Open daarna http://localhost:3000.

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
| `npm run seed:sql`   | `supabase/seed.sql` opnieuw maken uit de seed-data |
| `npm run icons`     | App-iconen opnieuw maken in `public/icons/` |

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

Zie [.env.example](.env.example). Geheimen staan alleen in `.env.local` (lokaal) en in
de instellingen van Vercel en GitHub, nooit in de code.

## Voortgang (PLAN.md §9)

Vooraf klaar uit het eerste plan: projectopzet, parser clubsite.

1. [ ] **Basis**: kopbalk met 4 tabs, feedbackknop, PWA-manifest en iconen zijn klaar.
   Nog te doen: Supabase koppelen, login alleen voor de eigenaar, deploy op Vercel.
2. [ ] **Data**: migratie en seed klaar en getest (PGlite). Nog te doen: uitvoeren in Supabase.
3. [ ] Overzicht + Competitie
4. [ ] Team + invoer
5. [ ] Match center
6. [ ] Scraper

Rekenregels (winkansmodel, rondes, uitslagen afleiden, aanwezigheidslijst, stats) staan
al in `src/lib/domain/` en zijn getest tegen het prototype.

## Database

| Bestand | Inhoud |
| --- | --- |
| `supabase/migrations/0001_init.sql` | Tabellen (PLAN.md §5.4), feedback, Row Level Security |
| `supabase/seed.sql` | Eenmalige import, gemaakt met `npm run seed:sql` uit `docs/seed-data.json` |
| `supabase/schema.test.ts` | Draait beide in PGlite en controleert aantallen en beveiliging |

Toegang: alleen e-mailadressen in de tabel `owners` kunnen data lezen of schrijven.

## Toegevoegd aan versie 1 (na het plan)

- **Feedbackknop:** klein icoon onderin op elk scherm. Opent een tekstvak; de melding
  wordt met pagina, schermbreedte en tijdstip opgeslagen in de tabel `feedback`, met
  status open/verwerkt. Meldingen worden later in één keer verwerkt.
