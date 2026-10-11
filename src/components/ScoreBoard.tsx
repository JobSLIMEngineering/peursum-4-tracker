"use client";

import { isPlayed, US, type Match } from "@/lib/domain/types";
import { TeamLogo } from "./TeamLogo";

/**
 * Scorebord in de stijl van de Instagram-posts van Peursum 4:
 * penseeltitel met rode streek, grote wapens met de naam eronder,
 * score in penseelletters (Peursum wit, tegenstander rood).
 */
export function ScoreBoard({
  match,
  title,
  size = "large",
  children,
}: {
  match: Match;
  title?: string;
  size?: "large" | "compact";
  children?: React.ReactNode;
}) {
  const played = isPlayed(match);
  const logo = size === "large" ? 76 : 54;
  const cls = (team: string) => (team === US ? "s-us" : "s-them");

  return (
    <div className={`board ${size}`}>
      <div className="board-title">{title ?? (played ? "Uitslag" : "Matchday")}</div>
      <div className="board-row">
        <div className="board-team">
          <TeamLogo team={match.home} size={logo} />
          <span>{match.home}</span>
        </div>
        <div className="board-score" aria-label={played ? `${match.homeGoals}–${match.awayGoals}` : "tegen"}>
          {played ? (
            <>
              <span className={cls(match.home)}>{match.homeGoals}</span>
              <span className="s-dash">-</span>
              <span className={cls(match.away)}>{match.awayGoals}</span>
            </>
          ) : (
            <span className="s-vs">vs</span>
          )}
        </div>
        <div className="board-team">
          <TeamLogo team={match.away} size={logo} />
          <span>{match.away}</span>
        </div>
      </div>
      {children}
    </div>
  );
}
