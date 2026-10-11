"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#e1242f", "#ffffff", "#ff5a63", "#f0b429", "#a3121c"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

/**
 * Vuurwerk in clubkleuren over het scherm, één keer per wedstrijd per sessie.
 * Niet bij "verminder beweging" in de instellingen van het apparaat.
 */
export function Fireworks({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const key = `p4-fw-${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      // geen opslag: gewoon tonen
    }
    // Pas als "gezien" markeren zodra het vuurwerk echt start (een afgebroken start telt niet)
    const markSeen = () => {
      try {
        sessionStorage.setItem(key, "1");
      } catch {
        // negeren
      }
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    c.width = W * dpr;
    c.height = H * dpr;
    g.scale(dpr, dpr);

    const parts: Particle[] = [];
    const burst = (x: number, y: number) => {
      const n = 60;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.2;
        const s = 2.5 + Math.random() * 3.5;
        parts.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 1,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 2 + Math.random() * 2.5,
        });
      }
    };

    const bursts = [
      [0.3, 0.3, 0],
      [0.72, 0.25, 250],
      [0.5, 0.45, 520],
      [0.22, 0.55, 800],
      [0.8, 0.5, 1050],
    ] as const;
    const timers = bursts.map(([fx, fy, t]) =>
      setTimeout(() => {
        if (t === 0) markSeen();
        burst(W * fx, H * fy);
      }, t),
    );

    let raf = 0;
    const startT = performance.now();
    const frame = (now: number) => {
      g.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += 0.06;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.012;
        if (p.life <= 0) continue;
        g.globalAlpha = Math.max(0, p.life);
        g.fillStyle = p.color;
        // schuine "confetti"-blokjes, in de stijl van de app
        g.save();
        g.translate(p.x, p.y);
        g.transform(1, 0, -0.3, 1, 0, 0);
        g.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
        g.restore();
      }
      if (now - startT < 3200) raf = requestAnimationFrame(frame);
      else g.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, [id]);

  return <canvas ref={ref} className="fireworks" aria-hidden="true" />;
}
