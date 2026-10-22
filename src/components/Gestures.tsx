"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Knop "naar boven" zodra je een eind naar beneden gescrold bent (vegen tussen schermen is eruit: de balk werkt beter) */
export function Gestures() {
  const [showTop, setShowTop] = useState(false);

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
