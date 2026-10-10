import type { Prediction } from "@/lib/domain/model";
import { outcome, type Outcome } from "@/lib/domain/types";
import { pct } from "@/lib/format";

/** Gekleurd uitslagblokje: groen winst, geel gelijk, rood verlies (vanuit Peursum) */
export function Score({
  home,
  away,
  ours,
  size,
}: {
  home: number;
  away: number;
  /** [voor, tegen] vanuit Peursum; zonder = neutraal grijs */
  ours?: [number, number];
  size?: number;
}) {
  const cls = ours ? outcome(ours[0], ours[1]) : "";
  return (
    <span
      className={`score ${cls}`}
      style={{
        ...(ours ? {} : { background: "var(--surface-2)", color: "#fff" }),
        ...(size ? { fontSize: size, minWidth: 44, padding: "1px 6px" } : {}),
      }}
    >
      {home}–{away}
    </span>
  );
}

export function WdlBar({ p }: { p: Pick<Prediction, "win" | "draw" | "loss"> }) {
  return (
    <div className="wdl" aria-label={`Winst ${pct(p.win)}%, gelijk ${pct(p.draw)}%, verlies ${pct(p.loss)}%`}>
      <span className="w" style={{ width: `${p.win * 100}%` }}>
        {pct(p.win)}% W
      </span>
      <span className="d" style={{ width: `${p.draw * 100}%` }}>
        {pct(p.draw)}%
      </span>
      <span className="l" style={{ width: `${p.loss * 100}%` }}>
        {pct(p.loss)}%
      </span>
    </div>
  );
}

export const OUTCOME_NL: Record<Outcome, string> = { W: "W", D: "G", L: "V" };

export function Box({
  label,
  right,
  children,
  className = "",
  bodyClass = "box-b",
  style,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClass?: string | null;
  style?: React.CSSProperties;
}) {
  return (
    <section className={`box ${className}`} style={style}>
      <div className="box-h">
        <p className="lbl">{label}</p>
        {right}
      </div>
      {bodyClass === null ? children : <div className={bodyClass}>{children}</div>}
    </section>
  );
}
