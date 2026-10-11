================================================================================
Project 012_Peursum 4 Tracker
================================================================================

Doel:     Persoonlijke web-app (Next.js op GitHub Pages) die de competitie van
          Peursum 4 en spelersstatistieken (goals, assists, keeper, kaarten)
          bijhoudt. Data komt van de openbare teampagina op vvpeursum.nl.

Plan:     docs/PLAN.md (10 okt 2026, vervangt de PDF van 1 okt)
          docs/prototype.html = referentie uiterlijk en logica
          docs/seed-data.json = eenmalige import
Code:     https://github.com/JobSLIMEngineering/peursum-4-tracker (openbaar)
Data:     https://github.com/JobSLIMEngineering/peursum-4-data (privé)
App:      https://jobslimengineering.github.io/peursum-4-tracker/
Uitleg:   README.md (starten, scripts, omgevingsvariabelen, voortgang)

Regels voor Claude:
- Lees AGENTS.md: Next.js 16 wijkt af, lees eerst de docs in
  node_modules/next/dist/docs/.
- Vraag Job om akkoord na stap 2 en na stap 5 (van PLAN.md).
- Werk de voortgang in README.md bij na elke stap.
- Alles staat op GitHub (geen Vercel/Supabase): keuze van Job, 11 okt 2026.
- Code-repository is openbaar: geen persoonlijke gegevens of geheimen erin.
  Persoonlijke data hoort in peursum-4-data.
- Let op: deze map staat in OneDrive. node_modules en .next worden mee
  gesynchroniseerd; bij sync-problemen OneDrive even pauzeren tijdens npm install.
