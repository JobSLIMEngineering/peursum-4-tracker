"use client";

import { useEffect, useState } from "react";

/**
 * Weer bij een wedstrijd (uur van de aftrap), via Open-Meteo: gratis, zonder account of sleutel.
 * Alle teams in de poule spelen in de Alblasserwaard/Vijfheerenlanden, dus één punt (Giessenburg)
 * is nauwkeurig genoeg. Er gaat niets over spelers of de gebruiker mee: alleen datum en dat punt.
 * Uitkomst wordt per apparaat onthouden (het weer van een gespeelde wedstrijd verandert niet meer).
 */

const LAT = 51.856;
const LON = 4.886;
const KEY = "p4-weather";

export interface Weather {
  /** WMO-weercode */
  code: number;
  temp: number;
}

const cache = (): Record<string, Weather> => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, Weather>;
  } catch {
    return {};
  }
};

/** Icoon + korte omschrijving bij een WMO-weercode */
export function weatherLabel(code: number): { icon: string; text: string } {
  if (code === 0) return { icon: "☀️", text: "zonnig" };
  if (code <= 2) return { icon: "🌤️", text: "half bewolkt" };
  if (code === 3) return { icon: "☁️", text: "bewolkt" };
  if (code <= 48) return { icon: "🌫️", text: "mist" };
  if (code <= 57) return { icon: "🌦️", text: "motregen" };
  if (code <= 67 || (code >= 80 && code <= 82)) return { icon: "🌧️", text: "regen" };
  if (code <= 77 || code === 85 || code === 86) return { icon: "❄️", text: "sneeuw" };
  return { icon: "⛈️", text: "onweer" };
}

/** Weer op een datum en tijd (alleen binnen ~2 weken vooruit en voor het verleden) */
export function useWeather(date: string | null, time: string | null): Weather | null {
  const hour = Number((time ?? "14:30").slice(0, 2));
  const key = `${date}T${hour}`;
  const [w, setW] = useState<Weather | null>(null);

  useEffect(() => {
    if (!date) return;
    const days = (Date.parse(`${date}T12:00`) - Date.now()) / 864e5;
    if (days > 15) return;
    const hit = cache()[key];
    const past = days < -1;
    // Gespeelde wedstrijd: onthouden. Komende: elke keer vers (voorspelling verandert)
    if (hit && past) {
      queueMicrotask(() => setW(hit));
      return;
    }
    let alive = true;
    const base =
      days < -80 ? "https://archive-api.open-meteo.com/v1/archive" : "https://api.open-meteo.com/v1/forecast";
    const url = `${base}?latitude=${LAT}&longitude=${LON}&hourly=weather_code,temperature_2m&timezone=Europe%2FAmsterdam&start_date=${date}&end_date=${date}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { hourly?: { weather_code: number[]; temperature_2m: number[] } } | null) => {
        const code = j?.hourly?.weather_code?.[hour];
        const temp = j?.hourly?.temperature_2m?.[hour];
        if (!alive || code == null || temp == null) return;
        const out = { code, temp: Math.round(temp) };
        setW(out);
        if (past)
          try {
            localStorage.setItem(KEY, JSON.stringify({ ...cache(), [key]: out }));
          } catch {
            // niet onthouden is geen probleem
          }
      })
      .catch(() => {
        // geen weer is geen probleem
      });
    return () => {
      alive = false;
    };
  }, [date, key, hour]);

  return w;
}

/** Klein icoontje met temperatuur, bijv. "🌧️ 9°" */
export function WeatherTag({ date, time }: { date: string | null; time: string | null }) {
  const w = useWeather(date, time);
  if (!w) return null;
  const l = weatherLabel(w.code);
  return (
    <span className="wx" title={`${l.text}, ${w.temp}°C`} aria-label={`Weer: ${l.text}, ${w.temp} graden`}>
      <span aria-hidden="true">{l.icon}</span> {w.temp}°
    </span>
  );
}
