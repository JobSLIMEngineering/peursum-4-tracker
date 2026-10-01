# Peursum 4 Tracker

Persoonlijke web-app die de competitie van Peursum 4 (VV Peursum, 5e klasse zaterdag)
en eenvoudige spelersstatistieken bijhoudt. Het volledige plan staat in
[docs/Plan Peursum 4 Tracker.pdf](docs/Plan%20Peursum%204%20Tracker.pdf).

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

## Voortgang

1. [x] Project opzetten (lokaal; Vercel volgt zodra het account er is)
2. [x] Parser voor de clubsite
3. [ ] Database en ophalen
4. [ ] Login
5. [ ] Schermen
6. [ ] Wedstrijdinvoer en statistieken

## Toegevoegd aan versie 1 (na het plan)

- **Feedbackknop:** klein icoon onderin op elk scherm. Opent een tekstvak; de melding
  wordt met pagina, schermbreedte en tijdstip opgeslagen in een tabel `feedback` in
  Supabase, met status open/verwerkt. Meldingen worden later in één keer verwerkt.
  Bouwen zodra de database er is (stap 3), knop zichtbaar vanaf stap 5.
