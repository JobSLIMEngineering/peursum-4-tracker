"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MatchDetail } from "@/components/competition/MatchDetail";
import { RoundsList } from "@/components/competition/RoundsList";

/** Competitie: rondes, of het detail van één wedstrijd via ?w=<id> (statische site, dus geen dynamische route) */
function Competitie() {
  const params = useSearchParams();
  const id = params.get("w");
  if (id) return <MatchDetail key={id} id={id} startEditing={params.get("wijzigen") === "1"} />;
  return <RoundsList />;
}

export default function CompetitiePage() {
  return (
    <Suspense fallback={<p className="meta">Laden…</p>}>
      <Competitie />
    </Suspense>
  );
}
