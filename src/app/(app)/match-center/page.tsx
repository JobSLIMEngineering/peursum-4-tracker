"use client";

import { useData } from "@/components/DataProvider";
import { MatchHero, PredictionBlocks } from "@/components/Prediction";
import { LineupChance } from "@/components/LineupChance";
import { Spotlights } from "@/components/Spotlights";
import { TopperBlock } from "@/components/TopperBlock";
import { nextMatch } from "@/lib/store/view";

/** Alleen over de eerstvolgende competitiewedstrijd (PLAN.md §3.4) */
export default function MatchCenterPage() {
  const { view } = useData();
  const next = nextMatch(view);

  if (!next) {
    return (
      <section className="box">
        <div className="box-b muted">Geen komende competitiewedstrijd bekend.</div>
      </section>
    );
  }

  return (
    <>
      <MatchHero match={next} />
      <TopperBlock match={next} />
      <LineupChance match={next} />
      <Spotlights match={next} />
      <PredictionBlocks view={view} match={next} />
    </>
  );
}
