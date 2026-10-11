# peursum-4-data (privé)

Gegevens van de Peursum 4 Tracker. De app staat in de openbare repository
[peursum-4-tracker](https://github.com/JobSLIMEngineering/peursum-4-tracker) en leest en
schrijft deze bestanden via de GitHub API met je eigen sleutel.

| Bestand | Inhoud | Wie schrijft |
| --- | --- | --- |
| `data/standings.json` | Elke opgehaalde stand (snapshot) | Ophaal-Action |
| `data/matches.json` | Alle wedstrijden met uitslagen | Ophaal-Action |
| `data/overrides.json` | Handmatige wijzigingen en eigen wedstrijden | App |
| `data/players.json` | Selectie, leenspelers, afgeschermde namen | App en Action (nieuwe spelers) |
| `data/entries.json` | Aanwezigheid en stats per wedstrijd | App |
| `data/feedback.json` | Meldingen van de feedbackknop | App |
| `data/sync.json` | Laatste ophaalrun | Ophaal-Action |

De Action **Ophalen clubsite** (`.github/workflows/sync.yml`) draait op zaterdag elk uur
en op zondag om 08/12/16/20 uur, en via de knop **Nu verversen** in de app.
