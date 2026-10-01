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

## Omgevingsvariabelen

Zie [.env.example](.env.example). Geheimen staan alleen in `.env.local` (lokaal) en in
de instellingen van Vercel en GitHub, nooit in de code.

## Voortgang

1. [x] Project opzetten (lokaal; Vercel volgt zodra het account er is)
2. [ ] Parser voor de clubsite
3. [ ] Database en ophalen
4. [ ] Login
5. [ ] Schermen
6. [ ] Wedstrijdinvoer en statistieken

## Toegevoegd aan versie 1 (na het plan)

- **Feedbackknop:** klein icoon onderin op elk scherm. Opent een tekstvak; de melding
  wordt met pagina, schermbreedte en tijdstip opgeslagen in een tabel `feedback` in
  Supabase, met status open/verwerkt. Meldingen worden later in één keer verwerkt.
  Bouwen zodra de database er is (stap 3), knop zichtbaar vanaf stap 5.
