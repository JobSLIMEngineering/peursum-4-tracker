"use client";

import type { Player } from "@/lib/domain/types";
import { useData } from "./DataProvider";

type ShirtPlayer = Pick<Player, "id" | "name" | "position" | "type" | "number" | "hiddenNo">;

/**
 * Kleuren: spelers rood met wit nummer; keeper geel met zwart nummer als hij de beste keeper van
 * de competitie is, anders groen; leenspelers grijs met zwart nummer.
 */
function colors(p: ShirtPlayer, gold: boolean) {
  if (p.position === "Keeper" && gold) return { top: "#ffd21f", bottom: "#e0a800", trim: "#1b1315", text: "#1b1315" };
  if (p.position === "Keeper") return { top: "#3fcf6e", bottom: "#1d9a48", trim: "#0f2a18", text: "#0f2a18" };
  if (p.type === "leen") return { top: "#b4b6ba", bottom: "#8a8c91", trim: "#4a4c50", text: "#1b1315" };
  return { top: "#e3262f", bottom: "#a3121c", trim: "#ffffff", text: "#ffffff" };
}

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.split(/\s+/).filter((w) => w && w[0] === w[0].toUpperCase());
  const first = parts[0]?.[0] ?? name[0];
  const last = parts.length > 1 ? parts.at(-1)![0] : "";
  return (first + last).toUpperCase();
}

/** Achternaam voor op de rug: het laatste woord met een hoofdletter ("van der Linden" → LINDEN) */
function surname(name: string | null): string | null {
  if (!name) return null;
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  return parts.at(-1)!.toUpperCase();
}

/**
 * Achterkant van een kort shirtje met achternaam en rugnummer (of initialen zonder nummer, "?" voor een
 * afgeschermde speler). Vervangt een foto: niets persoonlijks online.
 */
export function Shirt({ player, size = 48 }: { player: ShirtPlayer; size?: number }) {
  const { view } = useData();
  const c = colors(player, view.goldKeepers.has(player.id));
  const hasNo = player.number != null;
  const label = hasNo ? String(player.number) : initials(player.name);
  // Achternaam alleen als het shirt groot genoeg is om hem te lezen
  const name = size >= 44 ? surname(player.name) : null;
  const fs = hasNo ? (label.length > 1 ? 36 : 40) : label.length > 1 ? 26 : 32;
  const id = `sh-${c.top.slice(1)}`;

  return (
    <svg className="shirt" viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={hasNo ? `Rugnummer ${label}` : `Shirt ${label}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.top} />
          <stop offset="1" stopColor={c.bottom} />
        </linearGradient>
        <linearGradient id={`${id}-side`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity=".22" />
          <stop offset=".22" stopColor="#000" stopOpacity="0" />
          <stop offset=".78" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".22" />
        </linearGradient>
      </defs>
      {/* Romp en korte mouwen */}
      <path
        d="M36 9c4 3 9 4.5 14 4.5S60 12 64 9l18 6.5L96 35l-14 8.5-5-6.5V91c-9 3-18 4-27 4s-18-1-27-4V37l-5 6.5L4 35l14-19.5z"
        fill={`url(#${id})`}
      />
      <path
        d="M36 9c4 3 9 4.5 14 4.5S60 12 64 9l18 6.5L96 35l-14 8.5-5-6.5V91c-9 3-18 4-27 4s-18-1-27-4V37l-5 6.5L4 35l14-19.5z"
        fill={`url(#${id}-side)`}
      />
      {/* Kraag en mouwboorden */}
      <path d="M36 9c4 3 9 4.5 14 4.5S60 12 64 9" fill="none" stroke={c.trim} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M96 35l-14 8.5M4 35l14 8.5" stroke={c.trim} strokeWidth="3.5" strokeLinecap="round" />
      {name && (
        <text
          x="50"
          y="31"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="11"
          fill={c.text}
          letterSpacing=".5"
          {...(name.length > 8 ? { textLength: 46, lengthAdjust: "spacingAndGlyphs" } : {})}
        >
          {name}
        </text>
      )}
      <text x="50" y={name ? 60 : 56} textAnchor="middle" dominantBaseline="middle" fontSize={fs} fill={c.text} letterSpacing="-1">
        {label}
      </text>
    </svg>
  );
}
