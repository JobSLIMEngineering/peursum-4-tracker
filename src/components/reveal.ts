"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useData } from "./DataProvider";

/**
 * Pakjes die je eerst moet openen (speler van de maand, team van de maand). Per apparaat onthouden;
 * tot je het pakje geopend hebt, verklappen de kaarten op de spelerspagina ook niets.
 */
export const POTM_KEY = "p4-potm-opened";
export const TOTM_KEY = "p4-totm-opened";
const EVENT = "p4-reveal";

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

/** Pakje als geopend onthouden (en alle schermen bijwerken) */
export function markRevealed(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // niet onthouden is geen probleem
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Wat er voor dit pakje onthouden is (null op de server en zonder opslag) */
export function useStored(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
}

/** Is het team van de laatst afgesloten maand op dit apparaat al onthuld? */
export function useTotmRevealed(): boolean {
  const { view } = useData();
  const v = useStored(TOTM_KEY);
  return !!view.lastTotm && v === view.lastTotm.month;
}

/** Speciale kaart van een speler, maar alleen als het bijbehorende pakje al geopend is */
export function useSpecial() {
  const { view } = useData();
  const potmVal = useStored(POTM_KEY);
  const totmOpen = useTotmRevealed();
  const lastPotm = view.potms.at(-1);
  const potmOpen = !!lastPotm && potmVal === `${lastPotm.month}:${lastPotm.playerId}`;
  return useCallback(
    (id: string) => {
      const s = view.special[id];
      if (!s) return undefined;
      if (s.variant === "potm") {
        if (potmOpen) return s;
        // Speler van de maand nog dicht: wel de team-van-de-maand-kaart als dat pakje al open is
        return totmOpen && view.lastTotm?.ids.includes(id) ? { variant: "inform" as const, banner: view.lastTotm.banner } : undefined;
      }
      return totmOpen ? s : undefined;
    },
    [view, potmOpen, totmOpen],
  );
}
