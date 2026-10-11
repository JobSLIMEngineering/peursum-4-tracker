"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { predict } from "@/lib/domain/model";
import { opponent, US } from "@/lib/domain/types";
import { countdown, fmtDate, kickoff, pct } from "@/lib/format";
import { nextMatch } from "@/lib/store/view";
import { useData } from "./DataProvider";
import { TeamLogo } from "./TeamLogo";

/**
 * Rechtsboven in de kop: ons wapen vs dat van de volgende tegenstander,
 * met een kleine countdown en de winkans. Tik = Match center.
 */
export function HeaderMatchup() {
  const { view } = useData();
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [now, setNow] = useState(() => new Date());
  const next = nextMatch(view);

  useEffect(() => {
    const el = document.getElementById("matchup-slot");
    queueMicrotask(() => setSlot(el));
    el?.classList.add("has-matchup");
    return () => el?.classList.remove("has-matchup");
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!slot || !next?.date) return null;
  const opp = opponent(next);
  const left = countdown(kickoff(next.date, next.time), now);
  const p = predict(view.model, US, opp, next.home === US);
  const d = fmtDate(next.date);

  return createPortal(
    <Link
      href="/match-center/"
      className="matchup"
      aria-label={`Volgende wedstrijd: ${next.home} tegen ${next.away}, ${d.full} ${next.time ?? ""}. ${left ?? ""}. Naar Match center`}
    >
      <span className="mu-logos">
        <TeamLogo team={next.home} size={34} />
        <span className="mu-vs">vs</span>
        <TeamLogo team={next.away} size={34} />
      </span>
      <span className="mu-when">
        <b>{left ?? `${d.full} ${next.time ?? ""}`}</b>
        <span>
          {d.full} · {pct(p.win)}% winkans
        </span>
      </span>
    </Link>,
    slot,
  );
}
