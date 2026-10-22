"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TABS, tabIndex } from "@/lib/tabs";

/** Hier nooit swipen */
const NO_SWIPE = "textarea, select, .fb-panel, .sheet, .dock, [data-noswipe]";

/**
 * Niet swipen als je in een veld aan het typen bent, of als je begint in iets dat zelf
 * horizontaal scrolt (zoals de rondebalk). Een naamveld dat je alleen aanraakt telt niet.
 */
function blocksSwipe(target: Element | null): boolean {
  if (!target) return false;
  if (target.closest(NO_SWIPE)) return true;
  if (target instanceof HTMLInputElement && target === document.activeElement) return true;
  for (let el: Element | null = target; el && el !== document.body; el = el.parentElement) {
    const ox = getComputedStyle(el).overflowX;
    if ((ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth + 2) return true;
  }
  return false;
}

/**
 * Veeg naar links of rechts om naar de volgende of vorige tab te gaan,
 * plus een knop "naar boven" zodra je een eind naar beneden gescrold bent.
 */
export function Gestures() {
  const router = useRouter();
  const path = usePathname();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    // Richting vastzetten na de eerste ~12 px; horizontaal en ver genoeg = direct wisselen,
    // zonder op het loslaten te wachten (een scrollende browser stuurt soms geen touchend).
    let start: { x: number; y: number } | null = null;
    let axis: "x" | "y" | null = null;
    let done = false;

    const onStart = (e: TouchEvent) => {
      done = false;
      axis = null;
      const target = e.target as Element | null;
      start = e.touches.length === 1 && !blocksSwipe(target) ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    };

    const onMove = (e: TouchEvent) => {
      if (!start || done) return;
      const dx = e.touches[0].clientX - start.x;
      const dy = e.touches[0].clientY - start.y;
      if (!axis) {
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
        axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? "x" : "y";
        if (axis === "y") start = null;
        return;
      }
      if (Math.abs(dx) < 55) return;
      done = true;
      // Vegen alleen tussen de drie vaste schermen
      if (tabIndex(path) >= TABS.length) return;
      const i = tabIndex(path) + (dx < 0 ? 1 : -1);
      if (i >= 0 && i < TABS.length) {
        navigator.vibrate?.(8);
        router.push(TABS[i].href);
      }
    };

    const reset = () => {
      start = null;
      axis = null;
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", reset, { passive: true });
    document.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", reset);
      document.removeEventListener("touchcancel", reset);
    };
  }, [path, router]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 240);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return createPortal(
    <button
      type="button"
      className={`top-btn glass ${showTop ? "on" : ""}`}
      aria-label="Naar boven"
      tabIndex={showTop ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path d="M6 15l6-6 6 6" />
      </svg>
    </button>,
    document.body,
  );
}
