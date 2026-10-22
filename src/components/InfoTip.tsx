"use client";

import { useState } from "react";

/** Klein ⓘ-knopje; tik om de uitleg te tonen of te verbergen (scheelt tekst op het scherm) */
export function InfoTip({ children, label = "Uitleg" }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="info">
      <button type="button" className="info-btn" aria-label={label} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
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
