import type { MatchType, ScrapedMatch } from "./types";

/**
 * De clubsite vermeldt niet of een wedstrijd competitie, beker of oefen is.
 * Regel: speelt ons team tegen een team uit de eigen poule, dan is het competitie.
 * Anders oefen. Beker is niet automatisch te herkennen en stelt de gebruiker in de app in.
 */
export function guessMatchType(
  match: Pick<ScrapedMatch, "homeTeam" | "awayTeam">,
  ownTeam: string,
  poolTeams: string[],
): MatchType {
  const { homeTeam, awayTeam } = match;
  const opponent =
    homeTeam === ownTeam ? awayTeam : awayTeam === ownTeam ? homeTeam : null;
  if (opponent && poolTeams.includes(opponent)) return "competitie";
  return "oefen";
}
