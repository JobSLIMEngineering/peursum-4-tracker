"use client";

import { logoSrc } from "@/lib/logos";
import { useData } from "./DataProvider";

/** Clublogo naast een teamnaam. Peursum altijd het eigen wapen; onbekende teams krijgen geen logo. */
export function TeamLogo({ team, size = 20 }: { team: string; size?: number }) {
  const { view } = useData();
  const src = logoSrc(team, view.logos);
  if (!src) return <span className="tlogo" style={{ width: size, height: size }} aria-hidden="true" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- statische export, externe logo's
    <img className="tlogo" src={src} alt="" width={size} height={size} loading={size >= 28 ? "eager" : "lazy"} style={{ width: size, height: size }} />
  );
}
