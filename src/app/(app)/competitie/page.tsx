"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Calendar } from "@/components/competition/Calendar";
import { MatchDetail } from "@/components/competition/MatchDetail";
import { RoundsList } from "@/components/competition/RoundsList";

/** Competitie: rondes, of het detail van één wedstrijd via ?w=<id> (statische site, dus geen dynamische route) */
function Competitie() {
  const params = useSearchParams();
  const id = params.get("w");
  if (id) return <MatchDetail key={id} id={id} startEditing={params.get("wijzigen") === "1"} />;
  return <Overview />;
}

const VIEW_KEY = "p4-competitie-view";

/** Kalender (standaard) of de rondes onder elkaar; keuze onthouden per apparaat */
function Overview() {
  const [mode, setMode] = useState<"kalender" | "rondes">("kalender");
  useEffect(() => {
    try {
      if (localStorage.getItem(VIEW_KEY) === "rondes") queueMicrotask(() => setMode("rondes"));
    } catch {
      // geen opslag: kalender
    }
  }, []);
  const pick = (m: "kalender" | "rondes") => {
    setMode(m);
    try {
      localStorage.setItem(VIEW_KEY, m);
    } catch {
      // niet onthouden is geen probleem
    }
  };
  return (
    <>
      <div className="seg" role="group" aria-label="Weergave" style={{ marginBottom: 12 }}>
        <button type="button" aria-pressed={mode === "kalender"} onClick={() => pick("kalender")}>
          Kalender
        </button>
        <button type="button" aria-pressed={mode === "rondes"} onClick={() => pick("rondes")}>
          Rondes
        </button>
      </div>
      {mode === "kalender" ? <Calendar /> : <RoundsList />}
    </>
  );
}

export default function CompetitiePage() {
  return (
    <Suspense fallback={<p className="meta">Laden…</p>}>
      <Competitie />
    </Suspense>
  );
}
