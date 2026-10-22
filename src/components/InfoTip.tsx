"use client";

import { useEffect, useRef, useState } from "react";

/** Klein ⓘ-knopje; tik om de uitleg te tonen, tik ernaast (of nog eens) om hem weg te halen */
export function InfoTip({ children, label = "Uitleg" }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", off);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", off);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <span className="info" ref={ref}>
      <button
        type="button"
        className="info-btn"
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        i
      </button>
      {open && (
        <span className="info-pop" role="note">
          {children}
        </span>
      )}
    </span>
  );
}
