import type { PlayerCard } from "@/lib/domain/playercard";
import { playerLabel, type Player } from "@/lib/domain/types";
import { ShirtSvg } from "./Shirt";

type CardPlayer = Pick<Player, "id" | "name" | "position" | "type" | "number" | "hiddenNo">;

const FONT = "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif";

/** Kleuren per soort kaart; "special" = speler van de maand (zwart-rood met goud) */
export const TIERS = {
  goud: { a: "#fbeaa0", b: "#e0b43a", c: "#9c7410", ink: "#3b2a05", line: "#7a5a0c" },
  /** Zwart met goud, zoals de speciale kaarten bij FIFA: voor de paar besten */
  zwartgoud: { a: "#3a3020", b: "#14110b", c: "#000000", ink: "#f4c542", line: "#d4a017" },
  special: { a: "#5a0b12", b: "#22060a", c: "#0a0203", ink: "#f4c542", line: "#e1242f" },
} as const;
export type Tier = keyof typeof TIERS;

/** Kortere naam voor op de kaart (achternaam, of voornaam als die er niet is) */
function cardName(p: CardPlayer) {
  const label = playerLabel(p);
  if (!p.name) return label;
  const parts = p.name.split(/\s+/);
  return (parts.length > 1 ? parts.at(-1)! : parts[0]).toUpperCase();
}

/**
 * FIFA-achtige spelerskaart met het shirtje in plaats van een foto.
 * Puur SVG (geen data uit de app), zodat hij ook in een canvas/video te tekenen is.
 */
export function PlayerCardSvg({
  card,
  player,
  gold = false,
  special = false,
  banner,
  width = 300,
}: {
  card: PlayerCard;
  player: CardPlayer;
  /** Keeper die de beste van de competitie is (geel shirt) */
  gold?: boolean;
  /** Speler van de maand: zwart-rode kaart */
  special?: boolean;
  /** Tekst bovenaan, bijv. "Speler van november" */
  banner?: string;
  width?: number;
}) {
  const t = TIERS[special ? "special" : card.tier];
  const id = `card-${special ? "sp" : card.tier}`;
  const shape = "M24 0H276Q300 0 300 24V356Q300 378 282 388L150 420L18 388Q0 378 0 356V24Q0 0 24 0Z";
  const rows = [card.stats.slice(0, 3), card.stats.slice(3)];

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" width={width} height={(width * 420) / 300} role="img" aria-label={`Spelerskaart ${playerLabel(player)}: ${card.overall}`}>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={t.a} />
          <stop offset=".55" stopColor={t.b} />
          <stop offset="1" stopColor={t.c} />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={shape} />
        </clipPath>
      </defs>
      <path d={shape} fill={`url(#${id}-bg)`} />
      <g clipPath={`url(#${id}-clip)`}>
        {/* Schuine banen en een glansstreep */}
        <path d="M190 -10L300 -10L300 120Z" fill="#000" opacity=".08" />
        <path d="M-10 240L120 420L-10 420Z" fill="#000" opacity=".1" />
        <rect x="-160" y="0" width="120" height="420" fill={`url(#${id}-shine)`} transform="rotate(20 150 210)" />
        {special && <path d="M0 0H300V6H0Z" fill={t.line} />}
        {/* Zwart-goud: gouden schuine banen door het zwart */}
        {!special && card.tier === "zwartgoud" && (
          <>
            <path d="M-20 300L320 40L320 70L-20 330Z" fill="#d4a017" opacity=".35" />
            <path d="M-20 360L320 100L320 112L-20 372Z" fill="#f4c542" opacity=".25" />
            <path d="M200 -10L320 -10L320 60Z" fill="#f4c542" opacity=".18" />
          </>
        )}
      </g>
      <path d="M24 10H276Q290 10 290 24V352Q290 370 276 378L150 408L24 378Q10 370 10 352V24Q10 10 24 10Z" fill="none" stroke={t.line} strokeOpacity=".55" strokeWidth="2" />

      {banner && (
        <text x="150" y="34" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="15" letterSpacing="2" fill={t.ink}>
          {banner.toUpperCase()}
        </text>
      )}

      {/* Cijfer en positie linksboven, met het clubje eronder */}
      <text x="58" y="98" textAnchor="middle" fontFamily={FONT} fontWeight="900" fontSize="62" fill={t.ink}>
        {card.overall}
      </text>
      <text x="58" y="126" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="22" letterSpacing="1" fill={t.ink}>
        {card.pos}
      </text>
      <line x1="34" x2="82" y1="140" y2="140" stroke={t.ink} strokeOpacity=".4" strokeWidth="2" />
      <circle cx="58" cy="166" r="17" fill="#e1242f" stroke="#fff" strokeWidth="2" />
      <text x="58" y="172" textAnchor="middle" fontFamily={FONT} fontWeight="900" fontSize="16" fill="#fff">
        P4
      </text>

      {/* Shirt in plaats van een foto */}
      <g transform="translate(104 36)">
        <ShirtSvg player={player} size={180} gold={gold} />
      </g>

      <text x="150" y="262" textAnchor="middle" fontFamily={FONT} fontWeight="900" fontSize={cardName(player).length > 12 ? 26 : 32} letterSpacing="1" fill={t.ink}>
        {cardName(player)}
      </text>
      <line x1="40" x2="260" y1="278" y2="278" stroke={t.ink} strokeOpacity=".35" strokeWidth="2" />
      <line x1="150" x2="150" y1="290" y2="368" stroke={t.ink} strokeOpacity=".25" strokeWidth="2" />
      {rows.map((col, c) =>
        col.map((s, r) => (
          <g key={s.key} transform={`translate(${c ? 170 : 52} ${310 + r * 30})`}>
            <text x="0" y="0" fontFamily={FONT} fontWeight="900" fontSize="24" fill={t.ink}>
              {s.value}
            </text>
            <text x="34" y="0" fontFamily={FONT} fontWeight="700" fontSize="20" fill={t.ink} opacity=".85">
              {s.key}
            </text>
          </g>
        )),
      )}
    </svg>
  );
}
