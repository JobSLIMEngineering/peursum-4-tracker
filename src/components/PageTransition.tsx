"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { directionTo } from "@/lib/tabs";

/** Schuift het nieuwe scherm in vanuit de kant waar je naartoe gaat (of vervaagt bij hetzelfde tabblad). */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dir = directionTo(path);
    el.classList.remove("page-in-left", "page-in-right", "page-in");
    void el.offsetWidth; // animatie opnieuw starten
    el.classList.add(dir === 1 ? "page-in-right" : dir === -1 ? "page-in-left" : "page-in");
  }, [path]);

  return <div ref={ref}>{children}</div>;
}
