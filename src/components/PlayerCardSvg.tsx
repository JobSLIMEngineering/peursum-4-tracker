import type { PlayerCard } from "@/lib/domain/playercard";
import { playerLabel, splitName, type Player } from "@/lib/domain/types";
import { BASE } from "@/lib/base";
import { ShirtSvg } from "./Shirt";

type CardPlayer = Pick<Player, "id" | "name" | "position" | "type" | "number" | "hiddenNo">;

const FONT = "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif";

/** Kleuren per soort kaart; "special" = speler van de maand (zwart-rood met goud) */
export const TIERS = {
  goud: { a: "#fff1b8", b: "#e7bd45", c: "#a87d14", d: "#7a5a0c", ink: "#3b2a05", line: "#8a6510", glow: "#fff7d6" },
  /** Zwart met goud, zoals de speciale kaarten bij FIFA: voor de paar besten */
  zwartgoud: { a: "#3d3423", b: "#17130c", c: "#050403", d: "#000000", ink: "#f4c542", line: "#d4a017", glow: "#f4c542" },
  special: { a: "#6a0d15", b: "#2a070b", c: "#0b0203", d: "#000000", ink: "#f4c542", line: "#e1242f", glow: "#ff5a63" },
  /** Team van het seizoen (zoals TOTY/TOTS): diep blauw met goud */
  tots: { a: "#4f86f0", b: "#1d3fae", c: "#0c1d63", d: "#050c2e", ink: "#fbe7a1", line: "#f4c542", glow: "#9cc0ff" },
} as const;
export type Tier = keyof typeof TIERS;

/** Naam op twee regels: voornaam klein, achternaam (met tussenvoegsel) groot */
function cardName(p: CardPlayer): { first: string; last: string } {
  if (!p.name) return { first: "Afgeschermd", last: playerLabel(p).replace("Afgeschermde speler", "Speler").toUpperCase() };
  // Achternaam met tussenvoegsel; lang = tussenvoegsel afgekort ("V.D. LINDEN")
  const n = splitName(p.name, 12);
  return { first: n.first, last: n.last.toUpperCase() };
}

/** FIFA-vorm: afgeronde schouders, een inkeping bovenin het midden en een punt onderaan */
const SHAPE =
  "M34 6H118Q130 6 137 14L150 26L163 14Q170 6 182 6H266Q294 6 294 34V318Q294 340 276 351L150 414L24 351Q6 340 6 318V34Q6 6 34 6Z";
const INNER =
  "M38 16H116Q126 16 132 23L150 39L168 23Q174 16 184 16H262Q284 16 284 38V314Q284 333 268 342L150 402L32 342Q16 333 16 314V38Q16 16 38 16Z";

/**
 * Spelerskaart zoals in FIFA, met het shirtje in plaats van een foto.
 * Puur SVG (geen data uit de app), zodat hij ook in een canvas/video te tekenen is.
 * `width` weglaten = de kaart vult de breedte van zijn vak.
 */
export function PlayerCardSvg({
  card,
  player,
  gold = false,
  special = false,
  variant = "goud",
  banner,
  width,
  hattricks = 0,
  logo = `${BASE}/club-logo.png`,
}: {
  card: PlayerCard;
  player: CardPlayer;
  /** Keeper die de beste van de competitie is (geel shirt) */
  gold?: boolean;
  /** Speler van de maand: zwart-rode kaart */
  special?: boolean;
  /** Speciale kaart: team van de maand (zwart-goud), speler van de maand (rood-zwart), team van het seizoen (blauw) */
  variant?: "goud" | "inform" | "potm" | "tots";
  /** Tekst bovenaan, bijv. "Speler van november" */
  banner?: string;
  width?: number;
  /** Aantal hattricks dit seizoen (klein teken op de kaart) */
  hattricks?: number;
  /** Clublogo (adres of data-URL; voor de video moet het een data-URL zijn) */
  logo?: string;
}) {
  const kind: Tier = special || variant === "potm" ? "special" : variant === "inform" ? "zwartgoud" : variant === "tots" ? "tots" : card.tier;
  const t = TIERS[kind];
  const id = `card-${kind}`;
  const dark = kind !== "goud";
  const name = cardName(player);
  // De echte seizoenscijfers van de speler (wedstrijden, goals, assists, …)
  const left = card.facts.slice(0, 3);
  const right = card.facts.slice(3);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 300 420"
      {...(width ? { width, height: (width * 420) / 300 } : { width: "100%" })}
      className="pcard-svg"
      role="img"
      aria-label={`Spelerskaart ${playerLabel(player)}: ${card.overall} ${card.pos}${banner ? `, ${banner}` : ""}`}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2=".9" y2="1">
          <stop offset="0" stopColor={t.a} />
          <stop offset=".45" stopColor={t.b} />
          <stop offset=".8" stopColor={t.c} />
          <stop offset="1" stopColor={t.d} />
        </linearGradient>
        <radialGradient id={`${id}-halo`} cx=".62" cy=".3" r=".45">
          <stop offset="0" stopColor={t.glow} stopOpacity={dark ? 0.35 : 0.75} />
          <stop offset="1" stopColor={t.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity={dark ? 0.18 : 0.45} />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <pattern id={`${id}-lines`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="1.2" height="8" fill={dark ? "#fff" : "#000"} opacity={dark ? 0.05 : 0.06} />
        </pattern>
        <clipPath id={`${id}-clip`}>
          <path d={SHAPE} />
        </clipPath>
      </defs>

      {/* Kaart met rand, fijn lijnenpatroon, gloed achter het shirt en een glansstreep */}
      <path d={SHAPE} fill={t.line} transform="translate(0 2)" opacity=".45" />
      <path d={SHAPE} fill={`url(#${id}-bg)`} />
      <g clipPath={`url(#${id}-clip)`}>
        <rect width="300" height="420" fill={`url(#${id}-lines)`} />
        <rect width="300" height="260" fill={`url(#${id}-halo)`} />
        {kind === "zwartgoud" && (
          <>
            <path d="M-20 300L320 40L320 72L-20 332Z" fill="#d4a017" opacity=".32" />
            <path d="M-20 362L320 102L320 113L-20 373Z" fill="#f4c542" opacity=".22" />
          </>
        )}
        {kind === "tots" && (
          <>
            <path d="M-20 280L320 20L320 46L-20 306Z" fill="#9cc0ff" opacity=".28" />
            <path d="M-20 350L320 90L320 100L-20 360Z" fill="#f4c542" opacity=".35" />
          </>
        )}
        {kind === "special" && (
          <>
            <path d="M-20 290L320 30L320 52L-20 312Z" fill="#e1242f" opacity=".45" />
            <path d="M-20 340L320 80L320 88L-20 348Z" fill="#f4c542" opacity=".3" />
          </>
        )}
        <rect x="-170" y="-20" width="110" height="460" fill={`url(#${id}-shine)`} transform="rotate(24 150 210)" />
        {/* Sierlijnen langs de zijkanten */}
        <path d="M26 120V300M274 120V300" stroke={t.ink} strokeOpacity=".18" strokeWidth="1.5" />
      </g>
      <path d={INNER} fill="none" stroke={t.line} strokeOpacity={dark ? 0.9 : 0.6} strokeWidth="2" />

      {banner && (
        <text x="150" y="58" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="13" letterSpacing="2.5" fill={t.ink}>
          {banner.toUpperCase()}
        </text>
      )}

      {/* Cijfer, positie, club en "vlag" links */}
      <text x="66" y={banner ? 116 : 106} textAnchor="middle" fontFamily={FONT} fontWeight="900" fontSize="64" fill={t.ink}>
        {card.overall}
      </text>
      <text x="66" y={banner ? 146 : 136} textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="22" letterSpacing="1" fill={t.ink}>
        {card.pos}
      </text>
      <g transform={`translate(66 ${banner ? 172 : 162})`}>
        <line x1="-22" x2="22" y1="-12" y2="-12" stroke={t.ink} strokeOpacity=".35" strokeWidth="1.5" />
        {/* Het echte clubwapen van VV Peursum */}
        <image href={logo} x="-15" y="-6" width="30" height="40" preserveAspectRatio="xMidYMid meet" />
      </g>
      {/* Nederlandse vlag */}
      <g transform={`translate(51 ${banner ? 210 : 200})`}>
        <rect width="30" height="7" fill="#ae1c28" />
        <rect y="7" width="30" height="7" fill="#fff" />
        <rect y="14" width="30" height="7" fill="#21468b" />
        <rect width="30" height="21" fill="none" stroke={t.ink} strokeOpacity=".3" />
      </g>
      {hattricks > 0 && (
        <text x="66" y={banner ? 250 : 240} textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="13" fill={t.ink}>
          ⚽×3{hattricks > 1 ? ` ${hattricks}` : ""}
        </text>
      )}

      {/* Shirt in plaats van een foto */}
      {/* Met een tekst bovenin iets kleiner, zodat het shirt niet tegen de naam aan komt */}
      <g transform={`translate(${banner ? 112 : 104} ${banner ? 66 : 48})`}>
        <ShirtSvg player={player} size={banner ? 162 : 178} gold={gold} />
      </g>

      {/* Naam: voornaam klein erboven, achternaam groot eronder */}
      {name.first && (
        <text x="150" y="241" textAnchor="middle" fontFamily={FONT} fontWeight="700" fontSize="16" letterSpacing="1.5" fill={t.ink} opacity=".85">
          {name.first}
        </text>
      )}
      <text
        x="150"
        y={name.first ? 268 : 262}
        textAnchor="middle"
        fontFamily={FONT}
        fontWeight="900"
        fontSize={name.last.length > 14 ? 24 : name.last.length > 10 ? 27 : 31}
        letterSpacing=".5"
        fill={t.ink}
        // Lange achternamen passend maken binnen de kaart
        {...(name.last.length > 16 ? { textLength: 236, lengthAdjust: "spacingAndGlyphs" } : {})}
      >
        {name.last}
      </text>
      <path d="M40 280H128L150 286L172 280H260" fill="none" stroke={t.ink} strokeOpacity=".4" strokeWidth="1.5" />

      {/* Zes cijfers in twee kolommen */}
      <line x1="150" x2="150" y1="292" y2="362" stroke={t.ink} strokeOpacity=".3" strokeWidth="1.5" />
      {[left, right].map((col, c) =>
        col.map((s, r) => (
          // Cijfer rechts uitgelijnd tegen een vaste lijn, de afkorting er links uitgelijnd achter
          <g key={s.key} transform={`translate(${c ? 196 : 104} ${312 + r * 22})`}>
            <text x="0" y="0" textAnchor="end" fontFamily={FONT} fontWeight="900" fontSize="22" fill={t.ink}>
              {s.text}
            </text>
            <text x="8" y="0" fontFamily={FONT} fontWeight="700" fontSize="18" fill={t.ink} opacity=".85">
              {s.key}
            </text>
          </g>
        )),
      )}
    </svg>
  );
}
