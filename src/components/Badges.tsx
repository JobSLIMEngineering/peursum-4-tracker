"use client";

import { useEffect, useRef, useState } from "react";
import type { AwardKey } from "@/lib/domain/awards";
import { useData } from "./DataProvider";

export const AWARD_TITLE: Record<AwardKey, string> = {
  schoen: "Gouden Schoen",
  assist: "Assistkoning",
  handschoen: "Gouden Handschoen",
  muur: "IJzeren Muur",
  mvm: "Beste Middenvelder",
  kaarten: "Kaartenkoning",
};

const GLYPH: Record<AwardKey, React.ReactNode> = {
  schoen: (
    <>
      <path d="M4 15V6h5v5l7 2.5c2 .7 4 2 4 4V18H4z" />
      <path d="M7 18v2.5M12 18v2.5M17 18v2.5" />
    </>
  ),
  assist: (
    <>
      <path d="M4 19c5 0 6-12 15-12" />
      <path d="M15 3.5 19 7l-4 3.5" />
    </>
  ),
  handschoen: (
    <>
      <path d="M7.5 17.5 5 13.2a1.4 1.4 0 0 1 2.4-1.4l1.1 1.7V6a1.3 1.3 0 0 1 2.6 0v5.5V4.5a1.3 1.3 0 0 1 2.6 0v7V5.5a1.3 1.3 0 0 1 2.6 0v6.5-4a1.3 1.3 0 0 1 2.6 0v7.5c0 1.6-.6 2.8-1.5 3.5" />
      <path d="M7.5 17.5h11.4V22H7.5z" />
    </>
  ),
  muur: <path d="M3 5h18v14H3zM3 9.7h18M3 14.3h18M9 5v4.7M15 5v4.7M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6M9 14.3V19M15 14.3V19" />,
  mvm: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  kaarten: (
    <>
      <rect x="4" y="5" width="9" height="13" rx="1.5" transform="rotate(-10 8.5 11.5)" />
      <rect x="11" y="5" width="9" height="13" rx="1.5" transform="rotate(10 15.5 11.5)" />
    </>
  ),
};

/** Gouden medaille aan een rood-wit lint, met het teken van de prijs erin; `plain` = alleen het teken */
export function Medal({ kind, size = 18, plain = false }: { kind: AwardKey; size?: number; plain?: boolean }) {
  if (plain)
    return (
      <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {GLYPH[kind]}
      </svg>
    );
  const id = `md-${kind}`;
  return (
    <svg className="medal" viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id={id} cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff4c2" />
          <stop offset=".45" stopColor="#f4c542" />
          <stop offset="1" stopColor="#a8770f" />
        </radialGradient>
      </defs>
      {/* Lint */}
      <path d="M9 0h6l3.5 11h-6z" fill="#e1242f" />
      <path d="M23 0h-6l-3.5 11h6z" fill="#a3121c" />
      <path d="M12.2 0h1.4l3.4 11h-1.4z" fill="#fff" opacity=".85" />
      {/* Penning */}
      <circle cx="16" cy="20.5" r="10.5" fill={`url(#${id})`} stroke="#8a6209" strokeWidth=".8" />
      <circle cx="16" cy="20.5" r="8.2" fill="none" stroke="#fff3c4" strokeOpacity=".55" strokeWidth=".8" />
      <g transform="translate(16 20.5) scale(.5) translate(-12 -12)" fill="none" stroke="#5b3f05" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
        {GLYPH[kind]}
      </g>
    </svg>
  );
}

/** Vlam met verloop geel → oranje → rood */
function Flame({ id }: { id: string }) {
  return (
    <svg className="fire" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#e1242f" />
          <stop offset=".55" stopColor="#ff7a1a" />
          <stop offset="1" stopColor="#ffd34d" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="M12.4 1.6c.6 3.2-1 5.1-2.6 6.9C8.2 10.2 6.6 12 6.6 15a5.4 5.4 0 0 0 10.8.3c0-1.9-.8-3.3-1.7-4.4.1 1.3-.3 2.4-1.2 3 .3-3.6-.8-6.7-2.1-9.1-.2 2.4-1.2 3.6-2.3 4.6.5-2.9 1.5-5.1 2.3-7.8Z"
      />
      <path fill="#fff3c4" opacity=".85" d="M12 13.2c-.9 1-1.6 1.8-1.6 3a1.8 1.8 0 0 0 3.6.1c0-1.2-.9-2-2-3.1Z" />
    </svg>
  );
}

/** Keeperhandschoen met een vlammetje erboven */
function Glove({ id }: { id: string }) {
  return (
    <svg className="fire" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#e1242f" />
          <stop offset="1" stopColor="#ffb02e" />
        </linearGradient>
      </defs>
      <path fill={`url(#${id})`} d="M17.6 1.2c.3 1.6-.5 2.5-1.2 3.3-.7.8-1.4 1.6-1.4 2.9a2.5 2.5 0 0 0 5 .1c0-.9-.4-1.5-.8-2 0 .6-.2 1.1-.6 1.4.1-1.7-.4-3.1-1-4.2Z" />
      <path
        fill="#f4c542"
        stroke="#7a5a0c"
        strokeWidth=".6"
        d="M6.2 8.3c.6 0 1 .4 1 1v3.2h.5V6.6a1 1 0 0 1 2 0v5.9h.5V5.8a1 1 0 0 1 2 0v6.7h.5V7a1 1 0 0 1 2 0v7.4l.9-1.4a1.2 1.2 0 0 1 2 1.2l-2.6 4.6a5 5 0 0 1-4.3 2.5h-.8A4.9 4.9 0 0 1 5.2 16.4V9.3c0-.6.4-1 1-1Z"
      />
      <rect x="6.6" y="19.6" width="8" height="2.6" rx=".6" fill="#e1242f" />
    </svg>
  );
}

/** Pleister: geblesseerd */
export function Plaster({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <g transform="rotate(-45 12 12)">
        <rect x="1.5" y="7.5" width="21" height="9" rx="4.5" fill="#e9b88f" stroke="#b9845c" strokeWidth=".8" />
        <rect x="8.5" y="7.9" width="7" height="8.2" fill="#f7dcc2" />
        <circle cx="4.6" cy="10.6" r=".7" fill="#b9845c" />
        <circle cx="4.6" cy="13.4" r=".7" fill="#b9845c" />
        <circle cx="19.4" cy="10.6" r=".7" fill="#b9845c" />
        <circle cx="19.4" cy="13.4" r=".7" fill="#b9845c" />
      </g>
    </svg>
  );
}

/**
 * Iconen achter een spelersnaam: on fire (vlam / handschoen), koploper van een prijs (medaille)
 * en geblesseerd bij de laatste wedstrijd (pleister). Tik voor de uitleg.
 */
export function Badges({ playerId }: { playerId: string }) {
  const { view } = useData();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const streaks = view.streaks[playerId] ?? [];
  const leads = view.leads[playerId] ?? [];
  const hurt = view.injuredLast.has(playerId);

  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [open]);

  if (!streaks.length && !leads.length && !hurt) return null;
  const reasons = [
    ...streaks.map((s) => ({ key: s.kind, icon: s.kind === "keeper" ? "🧤" : "🔥", text: `On fire: ${s.reason}` })),
    ...leads.map((k) => ({ key: k, icon: "🏆", text: `Koploper ${AWARD_TITLE[k]}` })),
    ...(hurt ? [{ key: "hurt", icon: "🩹", text: "Geblesseerd" }] : []),
  ];

  return (
    <span className="onfire" ref={ref}>
      <button
        type="button"
        className="onfire-btn"
        aria-label={reasons.map((r) => r.text).join(". ")}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        {streaks.map((s) =>
          s.kind === "keeper" ? <Glove key="k" id={`glove-${playerId}`} /> : <Flame key="s" id={`flame-${playerId}`} />,
        )}
        {leads.map((k) => (
          <Medal key={k} kind={k} />
        ))}
        {hurt && <Plaster />}
      </button>
      {open && (
        <span className="onfire-pop" role="note">
          {reasons.map((r) => (
            <span key={r.key}>
              <span aria-hidden="true">{r.icon}</span>
              {r.text}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
