"use client";

import { useData } from "@/components/DataProvider";
import { MatchHero, PredictionBlocks } from "@/components/Prediction";
import { SharePost } from "@/components/SharePost";
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
      <SharePost view={view} match={next} />
      <PredictionBlocks view={view} match={next} />
    </>
  );
}
