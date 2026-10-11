"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TABS, tabIndex } from "@/lib/tabs";

/** Hier nooit swipen */
const NO_SWIPE = "textarea, select, .fb-panel, [data-noswipe]";

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
    let start: { x: number; y: number; t: number } | null = null;

    const onStart = (e: TouchEvent) => {
      const target = e.target as Element | null;
      if (e.touches.length !== 1 || blocksSwipe(target)) {
        start = null;
        return;
      }
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
    };

    const onEnd = (e: TouchEvent) => {
      if (!start) return;
      const dx = e.changedTouches[0].clientX - start.x;
      const dy = e.changedTouches[0].clientY - start.y;
      const quick = Date.now() - start.t < 700;
      start = null;
      if (!quick || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;
      const i = tabIndex(path) + (dx < 0 ? 1 : -1);
      if (i >= 0 && i < TABS.length) router.push(TABS[i].href);
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [path, router]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      className={`top-btn ${showTop ? "on" : ""}`}
      aria-label="Naar boven"
      tabIndex={showTop ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path d="M6 15l6-6 6 6" />
      </svg>
    </button>
  );
}
