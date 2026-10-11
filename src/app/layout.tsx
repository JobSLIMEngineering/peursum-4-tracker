import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, Protest_Revolution } from "next/font/google";
import { BASE } from "@/lib/base";
import "./globals.css";

// Labels, teamnamen, hoofdletters met letterafstand
const barlowCond = Barlow_Condensed({
  variable: "--font-barlow-cond",
  weight: ["500", "600", "700", "800", "900"],
  subsets: ["latin"],
});
// Lopende tekst
const barlow = Barlow({ variable: "--font-barlow", weight: ["400", "500", "600"], subsets: ["latin"] });
// Droge penseelletter: alleen voor de scoreborden en deelposts ("UITSLAG", "MATCHDAY", score)
const marker = Protest_Revolution({ variable: "--font-marker", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Peursum 4",
  description: "Stand, programma, winkans en spelersstatistieken van Peursum 4",
  appleWebApp: { capable: true, title: "Peursum 4", statusBarStyle: "black" },
  icons: {
    icon: [
      { url: `${BASE}/icons/icon.svg`, type: "image/svg+xml" },
      { url: `${BASE}/icons/favicon-48.png`, sizes: "48x48", type: "image/png" },
    ],
    apple: `${BASE}/icons/apple-touch-icon.png`,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0707",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="nl"
      className={`${barlowCond.variable} ${barlow.variable} ${marker.variable}`}
      style={{ "--texture": `url(${BASE}/texture.jpg)`, "--brush": `url(${BASE}/brush.png)` } as React.CSSProperties}
    >
      <body>{children}</body>
    </html>
  );
}
