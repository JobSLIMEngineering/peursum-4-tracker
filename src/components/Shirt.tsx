import type { Player } from "@/lib/domain/types";

type ShirtPlayer = Pick<Player, "name" | "position" | "type" | "number" | "hiddenNo">;

/** Kleuren: spelers rood met wit nummer, keeper geel met zwart, leenspelers grijs met zwart */
function colors(p: ShirtPlayer) {
  if (p.position === "Keeper") return { top: "#ffd21f", bottom: "#e0a800", trim: "#1b1315", text: "#1b1315" };
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

/**
 * Achterkant van een kort shirtje met het rugnummer (of initialen zonder nummer, "?" voor een
 * afgeschermde speler). Vervangt een foto: niets persoonlijks online.
 */
export function Shirt({ player, size = 48 }: { player: ShirtPlayer; size?: number }) {
  const c = colors(player);
  const label = player.number != null ? String(player.number) : initials(player.name);
  const isNumber = player.number != null;
  const fs = isNumber ? (label.length > 1 ? 34 : 38) : label.length > 1 ? 24 : 30;
  const id = `sh-${c.top.slice(1)}`;

  return (
    <svg className="shirt" viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={isNumber ? `Rugnummer ${label}` : `Shirt ${label}`}>
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
      <text x="50" y={isNumber ? 67 : 63} textAnchor="middle" dominantBaseline="middle" fontSize={fs} fill={c.text} letterSpacing="-1">
        {label}
      </text>
    </svg>
  );
}
